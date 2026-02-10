import { Component, input, output, signal, inject, computed, viewChild, ElementRef, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Send, X, Reply } from 'lucide-angular';
import { CommentService } from '../../../../core/api/comment-service';
import { ToastService } from '../../../../core/services/toast-service';
import { AuthStore } from '../../../../core/stores/auth-store';
import { AutoResize } from '../../../directives/auto-resize';
import { AvatarComponent } from '../../../ui/avatar/avatar-component/avatar-component';
import { MentionAutocompleteComponent } from '../../mention-autocomplete/mention-autocomplete-component/mention-autocomplete-component';
import { CommentResponseDTO, CreaCommentoRequestDTO, UserSummaryDTO } from '../../../../models';
@Component({
  selector: 'app-comment-form-component',
  imports: [CommonModule,
    LucideAngularModule,
    AvatarComponent,
    AutoResize,
    MentionAutocompleteComponent,],
  templateUrl: './comment-form-component.html',
  styleUrl: './comment-form-component.scss',
})
export class CommentFormComponent {
private readonly commentService = inject(CommentService);
  private readonly toastService = inject(ToastService);
  private readonly authStore = inject(AuthStore);

  // Riferimento alla textarea per focus
  readonly textareaRef = viewChild<ElementRef<HTMLTextAreaElement>>('textareaEl');
  readonly mentionAutocomplete = viewChild<MentionAutocompleteComponent>('mentionAutocomplete');

  constructor() {
    // Quando replyTo cambia, focus sulla textarea
    effect(() => {
      const reply = this.replyTo();
      if (reply) {
        // setTimeout per aspettare il rendering
        setTimeout(() => {
          const textarea = this.textareaRef()?.nativeElement;
          if (textarea) {
            textarea.focus();
          }
        }, 100);
      }
    });
  }

  // Icone
  readonly SendIcon = Send;
  readonly XIcon = X;
  readonly ReplyIcon = Reply;

  // ========== INPUTS ==========

  /**
   * ID del post a cui aggiungere il commento
   */
  readonly postId = input.required<number>();

  /**
   * Commento a cui si sta rispondendo (opzionale)
   * Se presente, il form è in modalità "risposta"
   */
  readonly replyTo = input<CommentResponseDTO | null>(null);

  /**
   * Placeholder personalizzato
   * @default 'Scrivi un commento...'
   */
  readonly placeholder = input<string>('Scrivi un commento...');

  // ========== OUTPUTS ==========

  /**
   * Emesso quando un commento viene creato con successo
   */
  readonly created = output<CommentResponseDTO>();

  /**
   * Emesso quando l'utente annulla la risposta
   */
  readonly cancelReply = output<void>();

  // ========== STATE ==========

  readonly content = signal<string>('');
  readonly isSubmitting = signal<boolean>(false);

  // Stato menzioni
  readonly showMentionDropdown = signal<boolean>(false);
  readonly mentionSearchTerm = signal<string>('');
  readonly mentionStartIndex = signal<number>(-1);
  readonly dropdownPosition = signal<{ top: number; left: number }>({ top: 0, left: 0 });

  // ========== COMPUTED ==========

  /**
   * Utente corrente per avatar
   */
  readonly currentUser = computed(() => this.authStore.currentUser());

  /**
   * Verifica se è in modalità risposta
   */
  readonly isReplyMode = computed(() => this.replyTo() !== null);

  /**
   * Placeholder dinamico
   */
  readonly dynamicPlaceholder = computed(() => {
    const reply = this.replyTo();
    if (reply) {
      return `Rispondi a @${reply.autore.username}...`;
    }
    return this.placeholder();
  });

  /**
   * Disabilita submit se vuoto o in caricamento
   */
  readonly isSubmitDisabled = computed(() => {
    return !this.content().trim() || this.isSubmitting();
  });

  // ========== METHODS ==========

  /**
   * Gestisce input textarea
   */
  onInput(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    const value = textarea.value;
    const cursorPos = textarea.selectionStart;

    this.content.set(value);
    this.checkForMention(value, cursorPos, textarea);
  }

  /**
   * Invia il commento
   */
  submit(): void {
    const trimmedContent = this.content().trim();
    if (!trimmedContent || this.isSubmitting()) return;

    this.isSubmitting.set(true);

    const request: CreaCommentoRequestDTO = {
      contenuto: trimmedContent,
    };

    // Se è una risposta, aggiungi parentCommentId
    const reply = this.replyTo();
    if (reply) {
      request.parentCommentId = reply.id;
    }

    this.commentService.createComment(this.postId(), request).subscribe({
      next: (comment) => {
        this.content.set('');
        this.isSubmitting.set(false);
        this.created.emit(comment);
        
        if (reply) {
          this.toastService.success('Risposta pubblicata');
        } else {
          this.toastService.success('Commento pubblicato');
        }
      },
      error: () => {
        this.isSubmitting.set(false);
        this.toastService.error('Errore nella pubblicazione');
      },
    });
  }

  /**
   * Annulla risposta
   */
  cancel(): void {
    this.content.set('');
    this.cancelReply.emit();
  }

  /**
   * Gestisce invio con Ctrl+Enter e navigazione menzioni
   */
  onKeydown(event: KeyboardEvent): void {
    // Se il dropdown è aperto, delega la gestione al componente autocomplete
    if (this.showMentionDropdown()) {
      const handled = this.mentionAutocomplete()?.handleKeydown(event);
      if (handled) {
        return;
      }
    }

    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      this.submit();
    }
  }

  // ========== METODI MENZIONI ==========

  /**
   * Controlla se l'utente sta digitando una menzione
   */
  private checkForMention(text: string, cursorPos: number, textarea: HTMLTextAreaElement): void {
    // Trova l'ultima @ prima del cursore
    const textBeforeCursor = text.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex === -1) {
      this.closeMentionDropdown();
      return;
    }

    // Verifica che @ sia all'inizio o preceduta da spazio/newline
    const charBefore = lastAtIndex > 0 ? text[lastAtIndex - 1] : ' ';
    if (!/[\s\n]/.test(charBefore) && lastAtIndex !== 0) {
      this.closeMentionDropdown();
      return;
    }

    // Estrai il testo dopo @
    const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);

    // Se c'è uno spazio dopo @, non è più una menzione attiva
    if (/\s/.test(textAfterAt)) {
      this.closeMentionDropdown();
      return;
    }

    // Aggiorna lo stato
    this.mentionStartIndex.set(lastAtIndex);
    this.mentionSearchTerm.set(textAfterAt);
    this.showMentionDropdown.set(true);

    // Calcola posizione dropdown
    this.calculateDropdownPosition(textarea);

    // Trigger ricerca nel componente autocomplete
    this.mentionAutocomplete()?.search(textAfterAt);
  }

  /**
   * Calcola la posizione del dropdown
   */
  private calculateDropdownPosition(textarea: HTMLTextAreaElement): void {
    const rect = textarea.getBoundingClientRect();
    
    // Posizione sopra la textarea per i commenti (spazio limitato)
    this.dropdownPosition.set({
      top: -4, // Sopra la textarea
      left: 0
    });
  }

  /**
   * Gestisce la selezione di un utente dal dropdown
   */
  onMentionSelected(user: UserSummaryDTO): void {
    const textarea = this.textareaRef()?.nativeElement;
    if (!textarea) return;

    const text = this.content();
    const startIndex = this.mentionStartIndex();
    const cursorPos = textarea.selectionStart;

    // Sostituisci @searchTerm con @username
    const beforeMention = text.substring(0, startIndex);
    const afterCursor = text.substring(cursorPos);
    const newText = `${beforeMention}@${user.username} ${afterCursor}`;

    this.content.set(newText);
    this.closeMentionDropdown();

    // Posiziona il cursore dopo la menzione
    setTimeout(() => {
      const newCursorPos = startIndex + user.username.length + 2; // +2 per @ e spazio
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      textarea.focus();
    });
  }

  /**
   * Chiude il dropdown delle menzioni
   */
  closeMentionDropdown(): void {
    this.showMentionDropdown.set(false);
    this.mentionSearchTerm.set('');
    this.mentionStartIndex.set(-1);
  }

  /**
   * Focus sulla textarea (chiamabile dall'esterno)
   */
  focus(): void {
    setTimeout(() => {
      const textarea = this.textareaRef()?.nativeElement;
      if (textarea) {
        textarea.focus();
      }
    }, 100);
  }
}
