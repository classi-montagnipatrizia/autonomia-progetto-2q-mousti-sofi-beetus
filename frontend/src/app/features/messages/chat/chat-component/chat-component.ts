import { Component, inject, OnInit, OnDestroy, signal, computed, ElementRef, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, ArrowLeft, Send, Image, Trash, EyeOff, X, Eye } from 'lucide-angular';
import { Subscription, interval, Subject } from 'rxjs';
import { switchMap, startWith, takeUntil, finalize } from 'rxjs/operators';
import { MessageService } from '../../../../core/api/message-service';
import { UserService } from '../../../../core/api/user-service';
import { WebsocketService } from '../../../../core/services/websocket-service';
import { AuthStore } from '../../../../core/stores/auth-store';
import { OnlineUsersStore } from '../../../../core/stores/online-users-store';
import { MessageResponseDTO, UserSummaryDTO } from '../../../../models';
import { AvatarComponent } from '../../../../shared/ui/avatar/avatar-component/avatar-component';
import { SkeletonComponent } from '../../../../shared/ui/skeleton/skeleton-component/skeleton-component';
import { DropdownComponent } from '../../../../shared/ui/dropdown/dropdown-component/dropdown-component';
import { CloudinaryStorageService } from '../../../../core/services/cloudinary-storage-service';
import { ToastService } from '../../../../core/services/toast-service';
import { TimeAgoComponent } from '../../../../shared/components/time-ago/time-ago-component/time-ago-component';
import { POLLING_INTERVALS, TIMEOUTS, LIMITS, UI_SPACING } from '../../../../core/config/app.config';

/**
 * Chat view per una singola conversazione.
 * Su mobile: schermo intero con freccia per tornare alla lista.
 * Su desktop: colonna destra del layout messaggi.
 */
@Component({
  selector: 'app-chat-component',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    AvatarComponent,
    SkeletonComponent,
    DropdownComponent,
    TimeAgoComponent,
  ],
  templateUrl: './chat-component.html',
  styleUrl: './chat-component.scss',
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
  private readonly cloudinaryService = inject(CloudinaryStorageService);
  private readonly toastService = inject(ToastService);
  
  private routeSub?: Subscription;
  private queryParamSub?: Subscription;
  private wsMessagesSub?: Subscription;
  private readonly pollingStop$ = new Subject<void>();
  private pendingScrollToMessageId: number | null = null;
  private isFirstLoad = true;
  private currentOtherUserId: number | null = null;
  private lastTypingSent = 0;

  // Usa costanti centralizzate da app.config.ts
  private readonly MESSAGE_POLLING_INTERVAL = POLLING_INTERVALS.MESSAGES;
  private readonly TYPING_POLLING_INTERVAL = POLLING_INTERVALS.TYPING;
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

  // Stato
  readonly otherUser = signal<UserSummaryDTO | null>(null);
  readonly messages = signal<MessageResponseDTO[]>([]);
  readonly isLoading = signal(true);
  readonly isSending = signal(false);
  readonly deletingIds = signal<Set<number>>(new Set());
  readonly error = signal<string | null>(null);
  readonly messageText = signal('');
  readonly isOtherUserTyping = signal(false);

  // Stato immagine
  readonly imagePreviewUrl = signal<string | null>(null);
  readonly pendingImageUrl = signal<string | null>(null);
  readonly isUploadingImage = signal(false);
  readonly imageViewerUrl = signal<string | null>(null);

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
    // Gestisce i cambiamenti di userId (nuova conversazione)
    this.routeSub = this.route.paramMap.subscribe(params => {
      const userIdParam = params.get('userId');
      if (userIdParam) {
        const userId = Number.parseInt(userIdParam, 10);

        // Leggi i query params correnti
        const queryParams = this.route.snapshot.queryParamMap;
        const messageIdParam = queryParams.get('messageId');
        const highlightParam = queryParams.get('highlight');

        // Imposta i parametri di ricerca PRIMA di switchToConversation
        if (messageIdParam) {
          const messageId = Number.parseInt(messageIdParam, 10);
          this.pendingScrollToMessageId = messageId;
          this.setHighlight(messageId, highlightParam);
        } else {
          this.pendingScrollToMessageId = null;
          this.clearHighlight();
        }

        this.switchToConversation(userId);
      }
    });

    // Gestisce i cambiamenti dei query params (stesso userId ma messaggio diverso)
    this.queryParamSub = this.route.queryParamMap.subscribe(params => {
      const messageIdParam = params.get('messageId');
      const highlightParam = params.get('highlight');

      if (messageIdParam && this.currentOtherUserId !== null) {
        const messageId = Number.parseInt(messageIdParam, 10);

        // Se i messaggi sono già caricati, scrolla subito
        if (this.messages().length > 0) {
          this.setHighlight(messageId, highlightParam);
          this.scrollToMessage(messageId);
        } else {
          // Altrimenti salva per dopo
          this.pendingScrollToMessageId = messageId;
          this.setHighlight(messageId, highlightParam);
        }
      }
    });

    // Sottoscrizione ai messaggi WebSocket real-time
    this.wsMessagesSub = this.websocketService.messages$.subscribe({
      next: (newMessage: MessageResponseDTO) => {
        
        // Verifica se il messaggio appartiene alla conversazione corrente
        const isRelevant = 
          (newMessage.mittente.id === this.currentOtherUserId && newMessage.destinatario.id === this.currentUserId()) ||
          (newMessage.destinatario.id === this.currentOtherUserId && newMessage.mittente.id === this.currentUserId());
        
        if (isRelevant) {
          // Aggiungi il messaggio se non esiste già (evita duplicati dal polling)
          const currentMessages = this.messages();
          const exists = currentMessages.some(m => m.id === newMessage.id);
          
          if (!exists) {
            this.messages.set([...currentMessages, newMessage]);
            // Scrolla in basso per nuovi messaggi
            this.scrollToBottom();
          }
        }
      },
      error: () => {
        // Ignora errori WebSocket
      }
    });
  }

  ngOnDestroy(): void {
    // Clear typing quando lascia la chat
    if (this.currentOtherUserId) {
      this.messageService.clearTyping(this.currentOtherUserId).subscribe();
    }
    
    this.stopPolling();
    this.pollingStop$.complete();
    this.routeSub?.unsubscribe();
    this.queryParamSub?.unsubscribe();
    this.wsMessagesSub?.unsubscribe();
  }

  /**
   * Imposta l'evidenziazione di un messaggio con timeout automatico
   */
  private setHighlight(messageId: number, term: string | null): void {
    this.highlightedMessageId.set(messageId);
    this.highlightTerm.set(term);
    setTimeout(() => {
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
    this.isOtherUserTyping.set(false);
    this.messageText.set('');
    this.isFirstLoad = true;

    // Carica nuova conversazione
    this.loadUserInfo(userId);
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
   * Avvia polling per messaggi e typing
   */
  private startPolling(userId: number): void {
    // Polling messaggi
    interval(this.MESSAGE_POLLING_INTERVAL)
      .pipe(
        startWith(0),
        takeUntil(this.pollingStop$),
        switchMap(() => this.messageService.getConversation(userId))
      )
      .subscribe({
        next: (messages) => {
          // Verifica che sia ancora la stessa conversazione
          if (this.currentOtherUserId !== userId) return;

          const currentMessages = this.messages();
          const newMessagesCount = messages.length - currentMessages.length;

          this.messages.set(messages);
          this.isLoading.set(false);

          // Gestisce lo scroll dopo il caricamento
          if (this.isFirstLoad && messages.length > 0) {
            this.isFirstLoad = false;
            // Se c'è un messaggio specifico da cercare, scrolla a quello SENZA ANIMAZIONE
            if (this.pendingScrollToMessageId !== null) {
              const messageId = this.pendingScrollToMessageId;
              this.pendingScrollToMessageId = null;
              this.scrollToMessage(messageId, true); // instant scroll
            } else {
              // Altrimenti scrolla in basso
              this.scrollToBottom();
            }
          } else if (newMessagesCount > 0) {
            // Nuovi messaggi arrivati, scrolla in basso
            this.scrollToBottom();
          }
          
          // Marca come letti
          if (messages.length > 0) {
            this.messageService.markConversationAsRead(userId).subscribe();
          }
        },
        error: () => {
          if (this.currentOtherUserId !== userId) return;
          if (this.isLoading()) {
            this.error.set('Impossibile caricare i messaggi');
            this.isLoading.set(false);
          }
        },
      });

    // Polling typing
    interval(this.TYPING_POLLING_INTERVAL)
      .pipe(
        startWith(0),
        takeUntil(this.pollingStop$),
        switchMap(() => this.messageService.isTyping(userId))
      )
      .subscribe({
        next: (response) => {
          if (this.currentOtherUserId !== userId) return;
          this.isOtherUserTyping.set(response.isTyping);
        },
        error: () => {
          // Ignora errori di typing
        },
      });
  }

  /**
   * Gestisce input del messaggio e invia typing indicator
   */
  onMessageInput(value: string): void {
    this.messageText.set(value);
    
    // Invia typing indicator (throttled)
    const now = Date.now();
    if (this.currentOtherUserId && now - this.lastTypingSent > this.TYPING_THROTTLE) {
      this.lastTypingSent = now;
      this.messageService.setTyping(this.currentOtherUserId).subscribe();
    }
  }

  sendMessage(): void {
    const content = this.messageText().trim();
    const imageUrl = this.pendingImageUrl();
    const user = this.otherUser();

    if ((!content && !imageUrl) || !user || this.isSending()) return;

    this.isSending.set(true);
    const targetUserId = user.id;

    // Clear typing quando invia
    this.messageService.clearTyping(targetUserId).subscribe();

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

  trackByMessageId(index: number, message: MessageResponseDTO): number {
    return message.id;
  }

  /**
   * Evidenzia il termine di ricerca nel testo del messaggio
   */
  getHighlightedContent(message: MessageResponseDTO): string {
    const content = message.contenuto;
    if (!content) return '';

    const term = this.highlightTerm();
    const isHighlighted = this.highlightedMessageId() === message.id;

    if (!term || !isHighlighted) return content;

    const regex = new RegExp(`(${this.escapeRegex(term)})`, 'gi');
    return content.replace(regex, '<mark class="bg-yellow-400 text-gray-900 rounded px-0.5">$1</mark>');
  }

  private escapeRegex(string: string): string {
    return string.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
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
