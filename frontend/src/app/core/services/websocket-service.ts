import { Injectable, signal, inject, OnDestroy } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Subject, Subscription } from 'rxjs';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { TokenService } from '../auth/services/token-service';
import { LoggerService } from './logger.service';
import { WEBSOCKET_CONFIG } from '../config/app.config';
import {
  NotificationResponseDTO,
  MessageResponseDTO,
  PostResponseDTO,
  CommentResponseDTO
} from '../../models';

@Injectable({
  providedIn: 'root',
})
export class WebsocketService implements OnDestroy {
  private readonly tokenService = inject(TokenService);
  private readonly logger = inject(LoggerService);

  private client: Client | null = null;
  private reconnectAttempts = 0;
  private reconnectTimeoutId?: number;

  // Signal per lo stato della connessione
  public readonly connected = signal<boolean>(false);

  // Subjects per i vari tipi di messaggi in arrivo (type-safe)
  private readonly notificationsSubject = new Subject<NotificationResponseDTO>();
  private readonly messagesSubject = new Subject<MessageResponseDTO>();
  private readonly typingSubject = new Subject<TypingIndicator>();
  private readonly errorsSubject = new Subject<WebSocketError>();
  private readonly announcementsSubject = new Subject<Announcement>();
  private readonly newPostsSubject = new Subject<PostResponseDTO>();
  private readonly postUpdatedSubject = new Subject<PostResponseDTO>();
  private readonly postDeletedSubject = new Subject<PostDeletedEvent>();
  private readonly postLikedSubject = new Subject<PostLikeUpdate>();
  private readonly commentUpdatesSubject = new Subject<CommentUpdate>();
  private readonly commentsCountSubject = new Subject<CommentsCountUpdate>();
  private readonly userPresenceSubject = new Subject<UserPresenceEvent>();

  // Observables pubblici per sottoscrizioni
  public readonly notifications$ = this.notificationsSubject.asObservable();
  public readonly messages$ = this.messagesSubject.asObservable();
  public readonly typing$ = this.typingSubject.asObservable();
  public readonly errors$ = this.errorsSubject.asObservable();
  public readonly announcements$ = this.announcementsSubject.asObservable();
  public readonly newPosts$ = this.newPostsSubject.asObservable();
  public readonly postUpdated$ = this.postUpdatedSubject.asObservable();
  public readonly postDeleted$ = this.postDeletedSubject.asObservable();
  public readonly postLiked$ = this.postLikedSubject.asObservable();
  public readonly commentUpdates$ = this.commentUpdatesSubject.asObservable();
  public readonly commentsCount$ = this.commentsCountSubject.asObservable();
  public readonly userPresence$ = this.userPresenceSubject.asObservable();

  // Mappa per tenere traccia delle sottoscrizioni ai commenti per post
  private commentSubscriptions = new Map<number, StompSubscription>();

  /**
   * Connette al WebSocket server
   *
   * Endpoint: ws://localhost:8080/ws
   * Protocollo: STOMP over WebSocket con fallback SockJS
   *
   * Richiede token JWT per autenticazione
   */
  connect(): void {
    if (this.client?.connected) {
      this.logger.debug('[WebSocket] Già connesso');
      return;
    }

    const token = this.tokenService.getAccessToken();
    if (!token) {
      this.logger.error('[WebSocket] Token non disponibile, impossibile connettersi');
      return;
    }

    this.logger.info('[WebSocket] Inizializzazione connessione...');

    this.client = new Client({
      // Usa SockJS come trasporto (fallback per browser senza WebSocket nativo)
      webSocketFactory: () => new SockJS(environment.wsUrl),

      // Header di connessione (include token JWT)
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },

      // Debug (disabilita in produzione)
      debug: (str) => {
        this.logger.debug('[WebSocket STOMP]', str);
      },

      // Heartbeat per mantenere la connessione attiva
      heartbeatIncoming: WEBSOCKET_CONFIG.HEARTBEAT_INCOMING,
      heartbeatOutgoing: WEBSOCKET_CONFIG.HEARTBEAT_OUTGOING,

      // Riconnessione automatica disabilitata (gestita manualmente per exponential backoff)
      reconnectDelay: 0,

      // Callback successo connessione
      onConnect: () => {
        this.onConnected();
      },

      // Callback errore connessione
      onStompError: (frame) => {
        this.onError(frame);
      },

      // Callback disconnessione
      onDisconnect: () => {
        this.onDisconnected();
      },

      // Callback cambio stato WebSocket
      onWebSocketClose: () => {
        this.connected.set(false);
        this.scheduleReconnect();
      },
    });

    // Attiva la connessione
    this.client.activate();
  }

  /**
   * Disconnette dal WebSocket server
   */
  disconnect(): void {
    this.logger.info('[WebSocket] Disconnessione...');

    // Cancella eventuali tentativi di riconnessione pendenti
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = undefined;
    }

    // Cancella tutte le sottoscrizioni ai commenti
    this.commentSubscriptions.forEach((sub) => sub.unsubscribe());
    this.commentSubscriptions.clear();

    if (this.client) {
      this.client.deactivate();
      this.client = null;
      this.connected.set(false);
    }
  }

  ngOnDestroy(): void {
    this.disconnect();
  }

  /**
   * Callback chiamato quando la connessione è stabilita
   */
  private onConnected(): void {
    this.logger.info('[WebSocket] Connessione stabilita');
    this.connected.set(true);
    this.reconnectAttempts = 0;

    // Sottoscrizioni ai canali
    this.subscribeToChannels();
  }

  /**
   * Callback chiamato quando si verifica un errore
   */
  private onError(frame: unknown): void {
    this.logger.error('[WebSocket] Errore STOMP', frame);
    this.connected.set(false);
    this.scheduleReconnect();
  }

  /**
   * Callback chiamato quando la connessione viene chiusa
   */
  private onDisconnected(): void {
    this.logger.warn('[WebSocket] Disconnesso');
    this.connected.set(false);
  }

  /**
   * Pianifica un tentativo di riconnessione con exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= WEBSOCKET_CONFIG.MAX_RECONNECT_ATTEMPTS) {
      this.logger.error('[WebSocket] Raggiunto numero massimo di tentativi di riconnessione');
      return;
    }

    // Cancella timeout precedente se esiste
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
    }

    // Calcola delay con exponential backoff
    const delay = Math.min(
      WEBSOCKET_CONFIG.RECONNECT_DELAY_BASE *
      Math.pow(WEBSOCKET_CONFIG.RECONNECT_BACKOFF_MULTIPLIER, this.reconnectAttempts),
      WEBSOCKET_CONFIG.RECONNECT_DELAY_MAX
    );

    this.reconnectAttempts++;
    this.logger.info(`[WebSocket] Tentativo riconnessione ${this.reconnectAttempts}/${WEBSOCKET_CONFIG.MAX_RECONNECT_ATTEMPTS} tra ${delay}ms`);

    this.reconnectTimeoutId = window.setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Sottoscrive a un canale WebSocket
   */
  private subscribeToChannel<T>(
    destination: string,
    subject: Subject<T>,
    parser?: (data: unknown) => T
  ): void {
    if (!this.client) return;

    this.client.subscribe(destination, (message: IMessage) => {
      try {
        const data = JSON.parse(message.body);
        const parsedData = parser ? parser(data) : (data as T);
        subject.next(parsedData);
      } catch (error) {
        this.logger.error(`[WebSocket] Errore parsing messaggio da ${destination}`, error);
      }
    });
  }

  /**
   * Sottoscrive ai vari canali WebSocket
   */
  private subscribeToChannels(): void {
    if (!this.client) return;

    this.logger.debug('[WebSocket] Sottoscrizione ai canali...');

    // Sottoscrizione alle notifiche personali
    this.subscribeToChannel('/user/queue/notifications', this.notificationsSubject);

    // Sottoscrizione ai messaggi diretti
    this.subscribeToChannel('/user/queue/messages', this.messagesSubject);

    // Sottoscrizione agli indicatori di digitazione
    this.subscribeToChannel('/user/queue/typing', this.typingSubject);

    // Sottoscrizione agli errori
    this.client.subscribe('/user/queue/errors', (message: IMessage) => {
      try {
        const error = JSON.parse(message.body) as WebSocketError;
        this.logger.error('[WebSocket] Errore ricevuto dal server', error);
        this.errorsSubject.next(error);
      } catch (err) {
        this.logger.error('[WebSocket] Errore parsing errore', err);
      }
    });

    // Sottoscrizione agli annunci broadcast
    this.subscribeToChannel('/topic/announcements', this.announcementsSubject);

    // Sottoscrizione ai nuovi post (broadcast a tutti gli utenti)
    this.subscribeToChannel('/topic/posts', this.newPostsSubject);

    // Sottoscrizione ai post aggiornati
    this.subscribeToChannel('/topic/posts/updated', this.postUpdatedSubject);

    // Sottoscrizione ai post cancellati
    this.subscribeToChannel('/topic/posts/deleted', this.postDeletedSubject);

    // Sottoscrizione agli aggiornamenti like
    this.subscribeToChannel('/topic/posts/liked', this.postLikedSubject);

    // Sottoscrizione agli aggiornamenti conteggio commenti (globale)
    this.subscribeToChannel('/topic/posts/comments-count', this.commentsCountSubject);

    // Sottoscrizione agli eventi di presenza utenti (online/offline)
    this.subscribeToChannel('/topic/user-presence', this.userPresenceSubject);
  }

  /**
   * Invia un messaggio di test al server
   *
   * Destination: /app/test
   *
   * @param content contenuto del messaggio
   * @param type tipo opzionale del messaggio
   */
  sendTestMessage(content: string, type?: string): void {
    if (!this.client?.connected) {
      this.logger.error('[WebSocket] Non connesso, impossibile inviare messaggio');
      return;
    }

    this.client.publish({
      destination: '/app/test',
      body: JSON.stringify({ content, type }),
    });
  }

  /**
   * Invia un indicatore di digitazione
   *
   * Destination: /app/typing
   *
   * Notifica al destinatario che l'utente sta scrivendo un messaggio
   *
   * @param recipientUsername username del destinatario
   * @param isTyping true se sta digitando, false se ha smesso
   */
  sendTypingIndicator(recipientUsername: string, isTyping: boolean): void {
    if (!this.client?.connected) {
      this.logger.warn('[WebSocket] Non connesso, impossibile inviare typing indicator');
      return;
    }

    this.client.publish({
      destination: '/app/typing',
      body: JSON.stringify({
        recipientUsername,
        isTyping,
      }),
    });
  }

  /**
   * Sottoscrive agli aggiornamenti dei commenti per un post specifico
   *
   * @param postId ID del post
   */
  subscribeToPostComments(postId: number): void {
    if (!this.client?.connected) {
      this.logger.warn('[WebSocket] Non connesso, impossibile sottoscrivere ai commenti');
      return;
    }

    // Evita sottoscrizioni duplicate
    if (this.commentSubscriptions.has(postId)) {
      this.logger.debug(`[WebSocket] Già sottoscritto ai commenti del post ${postId}`);
      return;
    }

    const subscription = this.client.subscribe(
      `/topic/posts/${postId}/comments`,
      (message: IMessage) => {
        try {
          const update = JSON.parse(message.body) as CommentUpdate;
          this.commentUpdatesSubject.next(update);
        } catch (error) {
          this.logger.error(`[WebSocket] Errore parsing update commenti post ${postId}`, error);
        }
      }
    );

    this.commentSubscriptions.set(postId, subscription);
    this.logger.debug(`[WebSocket] Sottoscritto ai commenti del post ${postId}`);
  }

  /**
   * Cancella la sottoscrizione ai commenti di un post
   *
   * @param postId ID del post
   */
  unsubscribeFromPostComments(postId: number): void {
    const subscription = this.commentSubscriptions.get(postId);
    if (subscription) {
      subscription.unsubscribe();
      this.commentSubscriptions.delete(postId);
      this.logger.debug(`[WebSocket] Cancellata sottoscrizione commenti post ${postId}`);
    }
  }

  /**
   * Verifica se il WebSocket è connesso
   */
  isConnected(): boolean {
    return this.client?.connected ?? false;
  }
}

/**
 * Interfaccia per l'indicatore di digitazione
 */
export interface TypingIndicator {
  /** Username dell'utente che sta digitando */
  senderUsername: string;

  /** True se sta digitando, false se ha smesso */
  isTyping: boolean;
}

/**
 * Interfaccia per gli errori WebSocket
 */
export interface WebSocketError {
  /** Flag errore */
  error: boolean;

  /** Messaggio di errore */
  message: string;

  /** Timestamp dell'errore */
  timestamp: number;
}

/**
 * Interfaccia per annunci broadcast
 */
export interface Announcement {
  /** Titolo annuncio */
  title: string;

  /** Contenuto annuncio */
  message: string;

  /** Tipo annuncio */
  type: 'info' | 'warning' | 'error' | 'success';

  /** Timestamp */
  timestamp: number;
}

/**
 * Interfaccia per evento post cancellato
 */
export interface PostDeletedEvent {
  /** ID del post cancellato */
  postId: number;

  /** Timestamp */
  timestamp: number;
}

/**
 * Interfaccia per aggiornamenti like sui post
 */
export interface PostLikeUpdate {
  /** ID del post */
  postId: number;

  /** Nuovo conteggio dei like */
  likesCount: number;

  /** True se è stato aggiunto un like, false se rimosso */
  liked: boolean;

  /** Tipo dell'aggiornamento */
  type: 'like_update';
}

/**
 * Interfaccia per aggiornamenti commenti
 */
export interface CommentUpdate {
  /** ID del post */
  postId: number;

  /** Tipo dell'aggiornamento */
  type: 'comment_created' | 'comment_updated' | 'comment_deleted';

  /** Commento (presente per created e updated) */
  comment?: CommentResponseDTO;

  /** ID del commento (presente per deleted) */
  commentId?: number;

  /** ID del commento padre (presente per risposte) */
  parentCommentId?: number | null;
}

/**
 * Interfaccia per aggiornamenti conteggio commenti
 */
export interface CommentsCountUpdate {
  /** ID del post */
  postId: number;

  /** Nuovo conteggio dei commenti */
  commentsCount: number;

  /** Tipo dell'aggiornamento */
  type: 'comments_count_update';
}

/**
 * Interfaccia per eventi di presenza utenti (online/offline)
 */
export interface UserPresenceEvent {
  /** Tipo dell'evento */
  type: 'user_online' | 'user_offline';

  /** ID dell'utente */
  userId: number;

  /** Username dell'utente */
  username: string;

  /** Nome completo dell'utente */
  nomeCompleto: string;

  /** URL immagine profilo */
  profilePictureUrl: string | null;

  /** Stato online */
  isOnline: boolean;

  /** Classe dell'utente */
  classroom: string | null;

  /** Timestamp dell'evento */
  timestamp: number;
}
