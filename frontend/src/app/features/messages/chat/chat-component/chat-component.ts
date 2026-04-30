import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit, OnDestroy, signal, computed, ElementRef, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, ArrowLeft, Send, Image, Trash, EyeOff, X, Eye, Mic } from 'lucide-angular';
import { interval, Subject } from 'rxjs';
import { switchMap, takeUntil, finalize } from 'rxjs/operators';
import { MessageService } from '../../../../core/api/message-service';
import { UserService } from '../../../../core/api/user-service';
import { WebsocketService } from '../../../../core/services/websocket-service';
import { AuthStore } from '../../../../core/stores/auth-store';
import { OnlineUsersStore } from '../../../../core/stores/online-users-store';
import { TypingStore } from '../../../../core/stores/typing-store';
import { MessageResponseDTO, UserSummaryDTO } from '../../../../models';
import { AvatarComponent } from '../../../../shared/ui/avatar/avatar-component/avatar-component';
import { SkeletonComponent } from '../../../../shared/ui/skeleton/skeleton-component/skeleton-component';
import { DropdownComponent } from '../../../../shared/ui/dropdown/dropdown-component/dropdown-component';
import { CloudinaryStorageService } from '../../../../core/services/cloudinary-storage-service';
import { ToastService } from '../../../../core/services/toast-service';
import { TimeAgoComponent } from '../../../../shared/components/time-ago/time-ago-component/time-ago-component';
import { AudioRecorderComponent } from '../../../../shared/components/audio-recorder/audio-recorder-component/audio-recorder-component';
import { AudioPlayerComponent } from '../../../../shared/components/audio-player/audio-player-component/audio-player-component';
import { POLLING_INTERVALS, TIMEOUTS, LIMITS, UI_SPACING } from '../../../../core/config/app.config';
import { HighlightSegment, splitHighlight } from '../../../../core/utils/highlight.utils';
import { getChatDateLabel, isSameDay, formatExactTime } from '../../../../core/utils/chat-date.utils';

/**
 * Chat view per una singola conversazione.
 * Su mobile: schermo intero con freccia per tornare alla lista.
 * Su desktop: colonna destra del layout messaggi.
 */
@Component({
  selector: 'app-chat-component',
  standalone: true,
  imports: [
    FormsModule,
    LucideAngularModule,
    AvatarComponent,
    SkeletonComponent,
    DropdownComponent,
    TimeAgoComponent,
    AudioRecorderComponent,
    AudioPlayerComponent
],
  templateUrl: './chat-component.html',
  styleUrl: './chat-component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatComponent implements OnInit, OnDestroy {
  private readonly messagesContainer = viewChild<ElementRef<HTMLDivElement>>('messagesContainer');
  private readonly imageInputRef = viewChild<ElementRef<HTMLInputElement>>('imageInputRef');

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  private readonly userService = inject(UserService);
  private readonly websocketService = inject(WebsocketService);
  private readonly authStore = inject(AuthStore);
  private readonly onlineUsersStore = inject(OnlineUsersStore);
  private readonly typingStore = inject(TypingStore);
  private readonly cloudinaryService = inject(CloudinaryStorageService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly pollingStop$ = new Subject<void>();
  private pendingScrollToMessageId: number | null = null;
  private isFirstLoad = true;
  private currentOtherUserId: number | null = null;
  private lastTypingSent = 0;
  private highlightTimeoutId: ReturnType<typeof setTimeout> | null = null;

  // Usa costanti centralizzate da app.config.ts
  private readonly MESSAGE_POLLING_INTERVAL = POLLING_INTERVALS.MESSAGES;
  private readonly TYPING_THROTTLE = TIMEOUTS.TYPING_THROTTLE;
  private readonly HIGHLIGHT_DURATION = TIMEOUTS.MESSAGE_HIGHLIGHT;
  private readonly SCROLL_DELAY = TIMEOUTS.SCROLL_DELAY;
  private readonly SCROLL_RETRY_DELAY = TIMEOUTS.SCROLL_RETRY_DELAY;
  private readonly MAX_SCROLL_RETRIES = LIMITS.MAX_SCROLL_RETRIES;
  private readonly MESSAGE_SPACING = UI_SPACING.MESSAGE_SPACING;

  // Icone
  readonly ArrowLeftIcon = ArrowLeft;
  readonly SendIcon = Send;
  readonly ImageIcon = Image;
  readonly TrashIcon = Trash;
  readonly EyeOffIcon = EyeOff;
  readonly XIcon = X;
  readonly EyeIcon = Eye;
  readonly MicIcon = Mic;

  // Stato
  readonly otherUser = signal<UserSummaryDTO | null>(null);
  readonly messages = signal<MessageResponseDTO[]>([]);
  readonly isLoading = signal(true);
  readonly isSending = signal(false);
  readonly deletingIds = signal<Set<number>>(new Set());
  readonly error = signal<string | null>(null);
  readonly messageText = signal('');

  readonly isOtherUserTyping = computed(() => {
    const user = this.otherUser();
    if (!user) return false;
    return this.typingStore.isUserTypingByUsername(user.username);
  });

  // Stato immagine
  readonly imagePreviewUrl = signal<string | null>(null);
  readonly pendingImageUrl = signal<string | null>(null);
  readonly isUploadingImage = signal(false);
  readonly imageViewerUrl = signal<string | null>(null);
  readonly showRecorder = signal(false);

  // ID messaggio evidenziato dalla ricerca e termine da evidenziare
  readonly highlightedMessageId = signal<number | null>(null);
  readonly highlightTerm = signal<string | null>(null);

  // ID utente corrente
  readonly currentUserId = computed(() => this.authStore.userId());

  // Verifica se l'altro utente è online
  readonly isOtherUserOnline = computed(() => {
    const user = this.otherUser();
    if (!user) return false;
    return this.onlineUsersStore.isUserOnline(user.id);
  });

  // Stato online text
  readonly onlineStatusText = computed(() => {
    if (this.isOtherUserTyping()) {
      return 'Sta scrivendo...';
    }
    return this.isOtherUserOnline() ? 'Online' : 'Offline';
  });

  // Può inviare messaggio (testo o immagine)
  readonly canSend = computed(() => {
    const hasText = this.messageText().trim().length > 0;
    const hasImage = this.pendingImageUrl() !== null;
    return (hasText || hasImage) && !this.isSending() && !this.isUploadingImage();
  });

  ngOnInit(): void {
    // Cambiamenti di userId (nuova conversazione)
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        const userIdParam = params.get('userId');
        if (!userIdParam) return;

        const userId = Number.parseInt(userIdParam, 10);
        const queryParams = this.route.snapshot.queryParamMap;
        const messageIdParam = queryParams.get('messageId');
        const highlightParam = queryParams.get('highlight');

        if (messageIdParam) {
          const messageId = Number.parseInt(messageIdParam, 10);
          this.pendingScrollToMessageId = messageId;
          this.setHighlight(messageId, highlightParam);
        } else {
          this.pendingScrollToMessageId = null;
          this.clearHighlight();
        }

        this.switchToConversation(userId);
      });

    // Cambiamenti dei query params (stesso userId, messaggio diverso)
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        const messageIdParam = params.get('messageId');
        const highlightParam = params.get('highlight');

        if (!messageIdParam || this.currentOtherUserId === null) return;

        const messageId = Number.parseInt(messageIdParam, 10);

        if (this.messages().length > 0) {
          this.setHighlight(messageId, highlightParam);
          this.scrollToMessage(messageId);
        } else {
          this.pendingScrollToMessageId = messageId;
          this.setHighlight(messageId, highlightParam);
        }
      });

    // Messaggi WebSocket real-time
    this.websocketService.messages$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (newMessage: MessageResponseDTO) => {
          const isRelevant =
            (newMessage.mittente.id === this.currentOtherUserId && newMessage.destinatario.id === this.currentUserId()) ||
            (newMessage.destinatario.id === this.currentOtherUserId && newMessage.mittente.id === this.currentUserId());

          if (!isRelevant) return;

          const currentMessages = this.messages();
          if (currentMessages.some(m => m.id === newMessage.id)) return;

          this.messages.set([...currentMessages, newMessage]);
          this.scrollToBottom();
        },
        error: () => {
          // ignora errori WebSocket
        },
      });
  }

  ngOnDestroy(): void {
    const user = this.otherUser();
    if (user) {
      this.websocketService.sendTypingIndicator(user.username, false);
    }
    this.stopPolling();
    this.pollingStop$.complete();
    if (this.highlightTimeoutId !== null) {
      clearTimeout(this.highlightTimeoutId);
    }
  }

  /**
   * Imposta l'evidenziazione di un messaggio con timeout automatico
   */
  private setHighlight(messageId: number, term: string | null): void {
    this.highlightedMessageId.set(messageId);
    this.highlightTerm.set(term);
    if (this.highlightTimeoutId !== null) {
      clearTimeout(this.highlightTimeoutId);
    }
    this.highlightTimeoutId = setTimeout(() => {
      this.highlightTimeoutId = null;
      this.clearHighlight();
    }, this.HIGHLIGHT_DURATION);
  }

  /**
   * Rimuove l'evidenziazione
   */
  private clearHighlight(): void {
    this.highlightedMessageId.set(null);
    this.highlightTerm.set(null);
  }

  /**
   * Cambia conversazione - ferma polling vecchio e inizia nuovo
   */
  private switchToConversation(userId: number): void {
    // Se è la stessa conversazione, non ricaricare
    if (this.currentOtherUserId === userId) {
      return;
    }

    // Ferma polling della conversazione precedente
    this.stopPolling();

    // Reset stato
    this.currentOtherUserId = userId;
    this.messages.set([]);
    this.otherUser.set(null);
    this.isLoading.set(true);
    this.error.set(null);
    this.messageText.set('');
    this.isFirstLoad = true;

    // Carica nuova conversazione: prima richiesta immediata, poi polling periodico
    this.loadUserInfo(userId);
    this.loadMessages(userId);
    this.startPolling(userId);
  }

  /**
   * Ferma tutti i polling attivi
   */
  private stopPolling(): void {
    this.pollingStop$.next();
  }

  /**
   * Carica info utente
   */
  private loadUserInfo(userId: number): void {
    this.userService.getUserProfile(userId).subscribe({
      next: (user) => {
        // Verifica che sia ancora la stessa conversazione
        if (this.currentOtherUserId !== userId) return;
        
        this.otherUser.set({
          id: user.id,
          username: user.username,
          nomeCompleto: user.nomeCompleto,
          profilePictureUrl: user.profilePictureUrl,
          isOnline: user.isOnline,
          classroom: user.classroom ?? null,
        });
      },
      error: () => {
        if (this.currentOtherUserId !== userId) return;
        this.error.set('Utente non trovato');
        this.isLoading.set(false);
      },
    });
  }

  /**
   * Carica i messaggi una volta sola (prima apertura conversazione).
   * Separato dal polling periodico per non bloccare il rendering del skeleton.
   */
  private loadMessages(userId: number): void {
    this.messageService.getConversation(userId).subscribe({
      next: (messages) => this.applyMessages(messages, userId),
      error: () => {
        if (this.currentOtherUserId !== userId) return;
        this.error.set('Impossibile caricare i messaggi');
        this.isLoading.set(false);
      },
    });
  }

  /**
   * Avvia il polling periodico (backup al WebSocket, non sostituisce il caricamento iniziale).
   */
  private startPolling(userId: number): void {
    interval(this.MESSAGE_POLLING_INTERVAL)
      .pipe(
        takeUntil(this.pollingStop$),
        switchMap(() => this.messageService.getConversation(userId))
      )
      .subscribe({
        next: (messages) => this.applyMessages(messages, userId),
        error: () => { /* errori di polling non critici, WebSocket gestisce il real-time */ },
      });
  }

  /**
   * Applica la risposta del server alla lista messaggi locale.
   * Merge con eventuali messaggi aggiunti via WebSocket non ancora persistiti.
   */
  private applyMessages(messages: MessageResponseDTO[], userId: number): void {
    if (this.currentOtherUserId !== userId) return;

    const currentMessages = this.messages();

    // Merge: preserve any locally-added messages (from WS) that the poll
    // response hasn't persisted yet. Order by id ascending.
    const serverIds = new Set(messages.map(m => m.id));
    const localOnly = currentMessages.filter(m => !serverIds.has(m.id));
    const merged = localOnly.length > 0
      ? [...messages, ...localOnly].sort((a, b) => a.id - b.id)
      : messages;

    const newMessagesCount = merged.length - currentMessages.length;

    this.messages.set(merged);
    this.isLoading.set(false);

    if (this.isFirstLoad && messages.length > 0) {
      this.isFirstLoad = false;
      if (this.pendingScrollToMessageId !== null) {
        const messageId = this.pendingScrollToMessageId;
        this.pendingScrollToMessageId = null;
        this.scrollToMessage(messageId, true);
      } else {
        this.scrollToBottom();
      }
    } else if (newMessagesCount > 0) {
      this.scrollToBottom();
    }

    if (messages.length > 0) {
      this.messageService.markConversationAsRead(userId).subscribe();
    }
  }

  /**
   * Gestisce input del messaggio e invia typing indicator
   */
  onMessageInput(value: string): void {
    this.messageText.set(value);

    const user = this.otherUser();
    if (!user) return;

    const now = Date.now();
    if (now - this.lastTypingSent > this.TYPING_THROTTLE) {
      this.lastTypingSent = now;
      this.websocketService.sendTypingIndicator(user.username, true);
    }
  }

  sendMessage(): void {
    const content = this.messageText().trim();
    const imageUrl = this.pendingImageUrl();
    const user = this.otherUser();

    if ((!content && !imageUrl) || !user || this.isSending()) return;

    this.isSending.set(true);
    const targetUserId = user.id;

    this.websocketService.sendTypingIndicator(user.username, false);

    this.messageService.sendMessage({
      destinatarioId: targetUserId,
      contenuto: content || undefined,
      imageUrl: imageUrl || undefined,
    }).subscribe({
      next: (newMessage) => {
        // Verifica che sia ancora la stessa conversazione
        if (this.currentOtherUserId === targetUserId) {
          this.messages.update(msgs => [...msgs, newMessage]);
          this.messageText.set('');
          this.clearImagePreview();
          this.scrollToBottom();
        }
        this.isSending.set(false);
      },
      error: () => {
        this.isSending.set(false);
      },
    });
  }

  sendAudioMessage(event: { audioUrl: string; duration: number }): void {
    const user = this.otherUser();
    if (!user) return;

    this.showRecorder.set(false);
    this.isSending.set(true);
    const targetUserId = user.id;

    this.messageService.sendMessage({
      destinatarioId: targetUserId,
      audioUrl: event.audioUrl,
      audioDuration: event.duration,
    }).subscribe({
      next: (newMessage) => {
        if (this.currentOtherUserId === targetUserId) {
          this.messages.update(msgs => [...msgs, newMessage]);
          this.scrollToBottom();
        }
        this.isSending.set(false);
      },
      error: () => {
        this.isSending.set(false);
      },
    });
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  goBack(): void {
    this.router.navigate(['/messages']);
  }

  private scrollToBottom(): void {
    // Usa requestAnimationFrame per assicurarsi che il DOM sia pronto
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const container = this.messagesContainer();
        if (container) {
          const el = container.nativeElement;
          el.scrollTop = el.scrollHeight;
        }
      });
    });
  }

  /**
   * Scrolla a un messaggio specifico e lo centra nella vista
   */
  private scrollToMessage(messageId: number, instant = false, retryCount = 0): void {
    // Aspetta che il DOM sia completamente renderizzato
    setTimeout(() => {
      const container = this.messagesContainer();
      const element = document.getElementById(`message-${messageId}`);

      if (!container || !element) {
        return;
      }

      const containerEl = container.nativeElement;

      // Se il container non è ancora pronto, riprova (max retry limit)
      if (containerEl.clientHeight === 0) {
        if (retryCount < this.MAX_SCROLL_RETRIES) {
          setTimeout(() => this.scrollToMessage(messageId, instant, retryCount + 1), this.SCROLL_RETRY_DELAY);
        }
        return;
      }

      // Trova tutti i messaggi e calcola la posizione
      const allMessages = containerEl.querySelectorAll('[id^="message-"]');
      let targetOffset = 0;

      for (const msg of allMessages) {
        const msgEl = msg as HTMLElement;
        if (msgEl.id === `message-${messageId}`) {
          break;
        }
        targetOffset += msgEl.offsetHeight + this.MESSAGE_SPACING;
      }

      const containerHeight = containerEl.clientHeight;
      const elementHeight = element.offsetHeight;

      // Centra l'elemento nel container
      const scrollTo = targetOffset - (containerHeight / 2) + (elementHeight / 2);

      containerEl.scrollTo({
        top: Math.max(0, scrollTo),
        behavior: instant ? 'instant' : 'smooth'
      });
    }, instant ? 0 : this.SCROLL_DELAY);
  }

  getContentSegments(message: MessageResponseDTO): readonly HighlightSegment[] {
    const content = message.contenuto ?? '';
    if (!content) return [];
    const term = this.highlightTerm();
    const isHighlighted = this.highlightedMessageId() === message.id;
    if (!term || !isHighlighted) return [{ text: content, match: false }];
    return splitHighlight(content, term);
  }

  /**
   * Elimina o nasconde un messaggio.
   * - Se è un mio messaggio: soft delete (tutti vedono "Messaggio cancellato")
   * - Se è un messaggio altrui: nascondimento (solo io vedo "Hai nascosto questo messaggio")
   */
  deleteMessage(messageId: number): void {
    if (this.deletingIds().has(messageId)) return;

    this.deletingIds.update(set => new Set(set).add(messageId));

    this.messageService.deleteMessage(messageId)
      .pipe(finalize(() => {
        this.deletingIds.update(set => {
          const next = new Set(set);
          next.delete(messageId);
          return next;
        });
      }))
      .subscribe({
        next: () => {
          const currUserId = this.currentUserId();
          this.messages.update(msgs =>
            msgs.map(m => {
              if (m.id === messageId) {
                // Se sono il mittente -> soft delete (aggiorna flag)
                if (m.mittente.id === currUserId) {
                  return { ...m, isDeletedBySender: true };
                }
                // Se sono il destinatario -> il backend lo ha nascosto, aggiorna flag
                return { ...m, isHiddenByCurrentUser: true };
              }
              return m;
            })
          );
        },
        error: () => {
          // Ignora errori eliminazione
        },
      });
  }

  /**
   * Verifica se il messaggio è stato eliminato dal mittente
   */
  isMessageDeleted(message: MessageResponseDTO): boolean {
    return message.isDeletedBySender;
  }

  /**
   * Verifica se il messaggio è nascosto dall'utente corrente
   */
  isMessageHidden(message: MessageResponseDTO): boolean {
    return message.isHiddenByCurrentUser;
  }

  isDeleting(messageId: number): boolean {
    return this.deletingIds().has(messageId);
  }

  shouldShowDateSeparator(messages: MessageResponseDTO[], index: number): boolean {
    if (index === 0) return true;
    return !isSameDay(messages[index - 1].createdAt, messages[index].createdAt);
  }

  getDateLabel(dateStr: string): string {
    return getChatDateLabel(dateStr);
  }

  formatTime(dateStr: string | null | undefined): string {
    return formatExactTime(dateStr);
  }

  /**
   * Apre il file picker per selezionare un'immagine
   */
  openImagePicker(): void {
    this.imageInputRef()?.nativeElement.click();
  }

  /**
   * Gestisce la selezione di un'immagine
   */
  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    // Reset input per permettere la selezione dello stesso file
    input.value = '';

    // Crea preview locale immediata
    const reader = new FileReader();
    reader.onload = (e) => {
      this.imagePreviewUrl.set(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload su Cloudinary
    this.isUploadingImage.set(true);
    this.cloudinaryService.uploadImage(file, 'message').subscribe({
      next: (response) => {
        this.pendingImageUrl.set(response.secureUrl);
        this.isUploadingImage.set(false);
      },
      error: (err) => {
        this.toastService.error(err.message || "Errore durante l'upload dell'immagine");
        this.clearImagePreview();
        this.isUploadingImage.set(false);
      },
    });
  }

  /**
   * Rimuove l'immagine in preview.
   * Non eliminiamo da Cloudinary qui perché l'immagine non è ancora associata
   * a nessuna entità e il backend non può verificare la proprietà.
   * Le immagini orfane verranno gestite da un job di pulizia periodico.
   */
  clearImagePreview(): void {
    this.imagePreviewUrl.set(null);
    this.pendingImageUrl.set(null);
  }

  /**
   * Apre il visualizzatore immagini a schermo intero
   */
  openImageViewer(imageUrl: string): void {
    this.imageViewerUrl.set(imageUrl);
  }

  /**
   * Chiude il visualizzatore immagini
   */
  closeImageViewer(): void {
    this.imageViewerUrl.set(null);
  }
}
