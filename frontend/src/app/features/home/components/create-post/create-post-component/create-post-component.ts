import { Component, inject, signal, output, computed, viewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LucideAngularModule, Image, X } from 'lucide-angular';
import { AvatarComponent } from '../../../../../shared/ui/avatar/avatar-component/avatar-component';
import { ButtonComponent } from '../../../../../shared/ui/button/button-component/button-component';
import { ImageUploadComponent } from '../../../../../shared/components/image-upload/image-upload-component/image-upload-component';
import { MentionAutocompleteComponent } from '../../../../../shared/components/mention-autocomplete/mention-autocomplete-component/mention-autocomplete-component';
import { PostService } from '../../../../../core/api/post-service';
import { AuthStore } from '../../../../../core/stores/auth-store';
import { ToastService } from '../../../../../core/services/toast-service';
import { CreaPostRequestDTO, PostResponseDTO, UserSummaryDTO } from '../../../../../models';

@Component({
  selector: 'app-create-post-component',
  imports: [ CommonModule,
    LucideAngularModule,
    AvatarComponent,
    ButtonComponent,
    ImageUploadComponent,
    MentionAutocompleteComponent,],
  templateUrl: './create-post-component.html',
  styleUrl: './create-post-component.scss',
})
export class CreatePostComponent {
private readonly postService = inject(PostService);
  private readonly authStore = inject(AuthStore);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);

  // Riferimento alla textarea
  readonly textareaRef = viewChild<ElementRef<HTMLTextAreaElement>>('textareaEl');
  readonly mentionAutocomplete = viewChild<MentionAutocompleteComponent>('mentionAutocomplete');

  // Icone Lucide
  readonly ImageIcon = Image;
  readonly XIcon = X;

  // Stato UI
  readonly content = signal<string>('');
  readonly imageUrl = signal<string | null>(null);
  readonly showImageUpload = signal<boolean>(false);
  readonly isSubmitting = signal<boolean>(false);

  // Stato menzioni
  readonly showMentionDropdown = signal<boolean>(false);
  readonly mentionSearchTerm = signal<string>('');
  readonly mentionStartIndex = signal<number>(-1);
  readonly dropdownPosition = signal<{ top: number; left: number }>({ top: 0, left: 0 });

  // Lunghezza massima contenuto
  readonly MAX_CONTENT_LENGTH = 5000;

  /**
   * Emesso quando un nuovo post viene creato con successo
   */
  readonly postCreated = output<PostResponseDTO>();

  /**
   * Dati utente corrente
   */
  readonly currentUser = this.authStore.currentUser;

  /**
   * Placeholder dinamico con nome utente
   */
  readonly placeholder = computed(() => {
    const user = this.currentUser();
    const firstName = user?.nomeCompleto.split(' ')[0] || 'tu';
    return `A cosa stai pensando, ${firstName}?`;
  });

  /**
   * Verifica se il form è valido per il submit
   * Deve avere almeno contenuto o immagine
   */
  readonly canSubmit = computed(() => {
    const hasContent = this.content().trim().length > 0;
    const hasImage = !!this.imageUrl();
    const notSubmitting = !this.isSubmitting();
    const withinLimit = this.content().length <= this.MAX_CONTENT_LENGTH;

    return (hasContent || hasImage) && notSubmitting && withinLimit;
  });

  /**
   * Contatore caratteri
   */
  readonly charCount = computed(() => this.content().length);

  /**
   * Verifica se mostrare il contatore (quando si avvicina al limite)
   */
  readonly showCharCount = computed(() => {
    return this.charCount() > this.MAX_CONTENT_LENGTH - 500;
  });

  /**
   * Classi per il contatore caratteri
   */
  readonly charCountClasses = computed(() => {
    const remaining = this.MAX_CONTENT_LENGTH - this.charCount();

    if (remaining < 0) {
      return 'text-error-500 font-medium';
    }
    if (remaining < 100) {
      return 'text-warning-500';
    }
    return 'text-gray-400';
  });

  /**
   * Toggle visibilità upload immagine
   */
  toggleImageUpload(): void {
    this.showImageUpload.update((show) => !show);

    // Se nasconde l'upload, rimuove anche l'immagine
    if (!this.showImageUpload()) {
      this.imageUrl.set(null);
    }
  }

  /**
   * Gestisce il completamento dell'upload immagine
   */
  onImageUploaded(url: string): void {
    this.imageUrl.set(url);
  }

  /**
   * Gestisce la rimozione dell'immagine
   */
  onImageRemoved(): void {
    this.imageUrl.set(null);
  }

  /**
   * Gestisce errori di upload
   */
  onImageError(error: string): void {
    this.toastService.error(error);
  }

  /**
   * Rimuove l'immagine caricata
   */
  removeImage(): void {
    this.imageUrl.set(null);
    this.showImageUpload.set(false);
  }

  /**
   * Submit del post
   */
  submitPost(): void {
    if (!this.canSubmit()) return;

    this.isSubmitting.set(true);

    const request: CreaPostRequestDTO = {};

    // Aggiungi contenuto se presente
    const trimmedContent = this.content().trim();
    if (trimmedContent) {
      request.contenuto = trimmedContent;
    }

    // Aggiungi immagine se presente
    if (this.imageUrl()) {
      request.imageUrl = this.imageUrl()!;
    }

    this.postService.createPost(request).subscribe({
      next: (post) => {
        this.isSubmitting.set(false);
        this.resetForm();
        this.toastService.success('Post pubblicato!');
        this.postCreated.emit(post);
      },
      error: (error) => {
        this.isSubmitting.set(false);

        if (error.status === 400) {
          this.toastService.error('Il post deve contenere testo o un\'immagine');
        } else {
          this.toastService.error('Errore nella pubblicazione. Riprova.');
        }
      },
    });
  }

  /**
   * Resetta il form dopo il submit
   */
  private resetForm(): void {
    this.content.set('');
    this.imageUrl.set(null);
    this.showImageUpload.set(false);
    this.closeMentionDropdown();
  }

  // ========== METODI MENZIONI ==========

  /**
   * Gestisce l'input nella textarea per rilevare @
   */
  onTextareaInput(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    const value = textarea.value;
    const cursorPos = textarea.selectionStart;

    this.content.set(value);
    this.checkForMention(value, cursorPos, textarea);
  }

  /**
   * Gestisce i tasti nella textarea
   */
  onTextareaKeydown(event: KeyboardEvent): void {
    // Se il dropdown è aperto, delega la gestione al componente autocomplete
    if (this.showMentionDropdown()) {
      const handled = this.mentionAutocomplete()?.handleKeydown(event);
      if (handled) {
        return;
      }
    }
  }

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
    this.calculateDropdownPosition(textarea, lastAtIndex);

    // Trigger ricerca nel componente autocomplete
    this.mentionAutocomplete()?.search(textAfterAt);
  }

  /**
   * Calcola la posizione del dropdown basata sulla posizione del cursore
   */
  private calculateDropdownPosition(textarea: HTMLTextAreaElement, atIndex: number): void {
    const rect = textarea.getBoundingClientRect();
    
    // Posizione semplificata sotto la textarea
    this.dropdownPosition.set({
      top: rect.height + 4,
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
   * Naviga al profilo dell'utente corrente
   */
  goToProfile(): void {
    const userId = this.currentUser()?.id;
    if (userId) {
      this.router.navigate(['/profile', userId]);
    }
  }
}
