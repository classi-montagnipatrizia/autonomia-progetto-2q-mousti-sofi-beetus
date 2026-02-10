import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { UserService } from '../api/user-service';
import { UserSummaryDTO } from '../../models';
import { interval, Subscription, firstValueFrom } from 'rxjs';
import { TokenService } from '../auth/services/token-service';
import { WebsocketService } from '../services/websocket-service';
import { LoggerService } from '../services/logger.service';

@Injectable({
  providedIn: 'root',
})
export class OnlineUsersStore {
  private readonly userService = inject(UserService);
  private readonly tokenService = inject(TokenService);
  private readonly websocketService = inject(WebsocketService);
  private readonly logger = inject(LoggerService);

  // Intervallo di aggiornamento automatico 
  private readonly REFRESH_INTERVAL = 300000; // 5 minuti

  // Subscription per il polling e WebSocket
  private pollingSubscription: Subscription | null = null;
  private websocketSubscription: Subscription | null = null;

  // SIGNALS PRIVATI

  private readonly _onlineUsers = signal<UserSummaryDTO[]>([]);
  private readonly _loading = signal<boolean>(false);
  private readonly _lastUpdate = signal<Date | null>(null);

  // SIGNALS PUBBLICI READONLY

  readonly onlineUsers = this._onlineUsers.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly lastUpdate = this._lastUpdate.asReadonly();

  // COMPUTED SIGNALS

  /** Numero di utenti online */
  readonly onlineCount = computed(() => this._onlineUsers().length);

  /** Verifica se ci sono utenti online */
  readonly hasOnlineUsers = computed(() => this._onlineUsers().length > 0);

  /** Utenti online ordinati per username */
  readonly sortedByUsername = computed(() =>
    [...this._onlineUsers()].sort((a, b) => a.username.localeCompare(b.username))
  );

  /** Utenti online ordinati per nome completo */
  readonly sortedByName = computed(() =>
    [...this._onlineUsers()].sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto))
  );

  // COSTRUTTORE - Setup Auto-Refresh

  constructor() {
    // Avvia il polling solo se l'utente è autenticato
    this.startPolling();

    // Sottoscrivi agli eventi WebSocket per aggiornamenti real-time
    this.subscribeToWebSocketEvents();

    // Carica gli utenti online quando il WebSocket si connette
    this.subscribeToWebSocketConnection();
  }

  // METODI PUBBLICI - Gestione WebSocket

  /**
   * Sottoscrivi agli eventi WebSocket per aggiornamenti real-time dello stato online
   */
  private subscribeToWebSocketEvents(): void {
    this.websocketSubscription = this.websocketService.userPresence$.subscribe((event) => {
      if (event.type === 'user_online') {
        // Aggiungi o aggiorna l'utente come online
        const userSummary: UserSummaryDTO = {
          id: event.userId,
          username: event.username,
          nomeCompleto: event.nomeCompleto,
          profilePictureUrl: event.profilePictureUrl,
          isOnline: true,
          classroom: event.classroom ?? null,
        };
        this.markUserOnline(userSummary);
      } else if (event.type === 'user_offline') {
        // Rimuovi l'utente dalla lista online
        this.markUserOffline(event.userId);
      }
    });
  }

  /**
   * Carica la lista utenti online quando il WebSocket si connette
   */
  private subscribeToWebSocketConnection(): void {
    // Usa effect per reagire ai cambiamenti dello stato connected del WebSocket
    effect(() => {
      const isConnected = this.websocketService.connected();

      // Quando il WebSocket si connette, carica la lista degli utenti online
      if (isConnected) {
        this.loadOnlineUsers();
      }
    });
  }

  // METODI PUBBLICI - Gestione Polling

  /**
   * Avvia il polling automatico degli utenti online
   */
  startPolling(): void {
    // Non avviare se già in corso o se non autenticato
    if (this.pollingSubscription || !this.tokenService.getAccessToken()) {
      return;
    }

    this.pollingSubscription = interval(this.REFRESH_INTERVAL).subscribe(() => {
      // Controlla se l'utente è ancora autenticato prima di fare la richiesta
      if (this.tokenService.getAccessToken()) {
        this.refreshOnlineUsers();
      } else {
        this.stopPolling();
      }
    });
  }

  /**
   * Ferma il polling automatico degli utenti online
   * Chiamare questo metodo al logout
   */
  stopPolling(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = null;
    }
    if (this.websocketSubscription) {
      this.websocketSubscription.unsubscribe();
      this.websocketSubscription = null;
    }
    // Pulisci anche i dati
    this._onlineUsers.set([]);
    this._lastUpdate.set(null);
  }

  // METODI PUBBLICI - Caricamento Utenti Online

  /**
   * Carica tutti gli utenti online
   *
   * Utilizza getAllUsers() e filtra per isOnline = true
   * Il backend calcola isOnline dinamicamente (lastSeen > 5 minuti fa)
   */
  async loadOnlineUsers(): Promise<void> {
    this._loading.set(true);

    try {
      // Carica tutti gli utenti (paginazione grande per prendere tutti)
      const response = await firstValueFrom(this.userService.getAllUsers(0, 1000));

      if (!response) return;

      // Filtra solo gli utenti online
      const onlineUsers = response.content.filter((user) => user.isOnline);

      this._onlineUsers.set(onlineUsers);
      this._lastUpdate.set(new Date());
    } catch (error) {
      this.logger.error('Errore caricamento utenti online', error);
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Refresh silenzioso degli utenti online
   * Non mostra lo stato di loading per non disturbare l'UI
   */
  async refreshOnlineUsers(): Promise<void> {
    try {
      const response = await firstValueFrom(this.userService.getAllUsers(0, 1000));

      if (!response) return;

      const onlineUsers = response.content.filter((user) => user.isOnline);

      this._onlineUsers.set(onlineUsers);
      this._lastUpdate.set(new Date());
    } catch (error) {
      // Errori silenti durante refresh automatico
      this.logger.debug('Errore refresh utenti online (silente)', error);
    }
  }

  // METODI PUBBLICI - Query Utenti Online

  /**
   * Verifica se un utente specifico è online
   *
   * @param userId ID dell'utente da verificare
   */
  isUserOnline(userId: number): boolean {
    return this._onlineUsers().some((user) => user.id === userId);
  }

  /**
   * Verifica se un utente specifico è online (per username)
   *
   * @param username Username dell'utente da verificare
   */
  isUsernameOnline(username: string): boolean {
    return this._onlineUsers().some((user) => user.username === username);
  }

  /**
   * Ottiene i dati di un utente online specifico
   *
   * @param userId ID dell'utente
   */
  getOnlineUser(userId: number): UserSummaryDTO | undefined {
    return this._onlineUsers().find((user) => user.id === userId);
  }

  /**
   * Cerca utenti online per nome o username
   *
   * @param searchTerm termine di ricerca
   */
  searchOnlineUsers(searchTerm: string): UserSummaryDTO[] {
    const term = searchTerm.toLowerCase().trim();

    if (!term) {
      return this._onlineUsers();
    }

    return this._onlineUsers().filter(
      (user) =>
        user.username.toLowerCase().includes(term) || user.nomeCompleto.toLowerCase().includes(term)
    );
  }

  /**
   * Filtra utenti online escludendo alcuni ID
   * Utile per escludere l'utente corrente o altri
   *
   * @param excludeIds Lista di ID da escludere
   */
  getOnlineUsersExcluding(excludeIds: number[]): UserSummaryDTO[] {
    const excludeSet = new Set(excludeIds);
    return this._onlineUsers().filter((user) => !excludeSet.has(user.id));
  }

  // METODI PUBBLICI - Aggiornamento Stato

  /**
   * Marca un utente come online
   * Aggiunge alla lista se non presente, aggiorna se già presente
   *
   * Utilizzato quando si ricevono notifiche/messaggi da un utente
   * (sappiamo che è online se interagisce)
   *
   * @param user Dati utente
   */
  markUserOnline(user: UserSummaryDTO): void {
    this._onlineUsers.update((users) => {
      const index = users.findIndex((u) => u.id === user.id);

      if (index === -1) {
        // Utente non presente, aggiungilo
        return [...users, { ...user, isOnline: true }];
      } else {
        // Utente già presente, aggiornalo
        const updated = [...users];
        updated[index] = { ...user, isOnline: true };
        return updated;
      }
    });
  }

  /**
   * Marca un utente come offline
   * Rimuove dalla lista degli utenti online
   *
   * @param userId ID dell'utente
   */
  markUserOffline(userId: number): void {
    this._onlineUsers.update((users) => users.filter((user) => user.id !== userId));
  }

  /**
   * Aggiorna i dati di un utente online
   * Mantiene lo stato online ma aggiorna altri campi
   *
   * @param userId ID dell'utente
   * @param updates Aggiornamenti parziali
   */
  updateOnlineUser(userId: number, updates: Partial<UserSummaryDTO>): void {
    this._onlineUsers.update((users) =>
      users.map((user) => (user.id === userId ? { ...user, ...updates, isOnline: true } : user))
    );
  }

  // METODI PUBBLICI - Gestione Store

  /**
   * Pulisce lo store
   */
  clear(): void {
    this._onlineUsers.set([]);
    this._loading.set(false);
    this._lastUpdate.set(null);
  }

  /**
   * Forza il refresh immediato
   */
  async forceRefresh(): Promise<void> {
    await this.loadOnlineUsers();
  }

  /**
   * Verifica se il dato è stale (vecchio)
   * Considera stale se l'ultimo aggiornamento è più vecchio di 1 minuto
   */
  isStale(): boolean {
    const lastUpdate = this._lastUpdate();
    if (!lastUpdate) return true;

    const now = new Date();
    const diffMs = now.getTime() - lastUpdate.getTime();
    const diffMinutes = diffMs / 1000 / 60;

    return diffMinutes > 1;
  }

  /**
   * Raggruppa utenti online per iniziale del nome
   * Utile per UI con liste alfabetiche
   */
  groupByInitial(): Map<string, UserSummaryDTO[]> {
    const grouped = new Map<string, UserSummaryDTO[]>();

    this._onlineUsers().forEach((user) => {
      const initial = user.nomeCompleto.charAt(0).toUpperCase();
      const group = grouped.get(initial) || [];
      group.push(user);
      grouped.set(initial, group);
    });

    // Ordina ogni gruppo per nome
    grouped.forEach((users, key) => {
      const sortedUsers = [...users];
      sortedUsers.sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto));
      grouped.set(key, sortedUsers);
    });

    return grouped;
  }

  /**
   * Ottiene statistiche utenti online
   */
  getStats(): OnlineUsersStats {
    const users = this._onlineUsers();

    return {
      totalOnline: users.length,
      lastUpdate: this._lastUpdate(),
      isStale: this.isStale(),
    };
  }
}

/**
 * Statistiche utenti online
 */
export interface OnlineUsersStats {
  /** Numero totale utenti online */
  totalOnline: number;

  /** Data ultimo aggiornamento */
  lastUpdate: Date | null;

  /** Flag che indica se i dati sono stale */
  isStale: boolean;
}
