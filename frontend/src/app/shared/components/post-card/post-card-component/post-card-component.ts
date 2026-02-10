import { Component, input, output, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  LucideAngularModule,
  Ellipsis,
  Pencil,
  Trash2,
  EyeOff,
  Flag,
  X,
  Check,
} from 'lucide-angular';

import { PostResponseDTO } from '../../../../models';
import { AvatarComponent } from '../../../ui/avatar/avatar-component/avatar-component';
import { DropdownComponent } from '../../../ui/dropdown/dropdown-component/dropdown-component';
import { PostActionsComponent } from '../../post-actions/post-actions-component/post-actions-component';
import { TimeAgoComponent } from '../../time-ago/time-ago-component/time-ago-component';
import { SafeMentionTextComponent } from '../../safe-mention-text/safe-mention-text.component';
import { DialogService } from '../../../../core/services/dialog-service';
import { ToastService } from '../../../../core/services/toast-service';
import { AuthStore } from '../../../../core/stores/auth-store';
import { PostService } from '../../../../core/api/post-service';

@Component({
  selector: 'app-post-card-component',
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    AvatarComponent,
    DropdownComponent,
    PostActionsComponent,
    TimeAgoComponent,
    SafeMentionTextComponent,
  ],
  templateUrl: './post-card-component.html',
  styleUrl: './post-card-component.scss',
})
export class PostCardComponent {
  private readonly router = inject(Router);
  private readonly postService = inject(PostService);
  private readonly dialogService = inject(DialogService);
  private readonly toastService = inject(ToastService);
  private readonly authStore = inject(AuthStore);

  // Icone Lucide
  readonly EllipsisIcon = Ellipsis;
  readonly PencilIcon = Pencil;
  readonly Trash2Icon = Trash2;
  readonly EyeOffIcon = EyeOff;
  readonly FlagIcon = Flag;
  readonly XIcon = X;
  readonly CheckIcon = Check;

  /**
   * Dati del post da visualizzare
   */
  readonly post = input.required<PostResponseDTO>();

  /**
   * Mostra le azioni (like, commenti)
   * @default true
   */
  readonly showActions = input<boolean>(true);

  /**
   * Rende il post cliccabile per navigare al dettaglio
   * @default true
   */
  readonly clickable = input<boolean>(true);


  /**
   * Emesso quando il post viene eliminato
   */
  readonly deleted = output<number>();

  /**
   * Emesso quando il post viene modificato
   */
  readonly edited = output<PostResponseDTO>();

  /**
   * Emesso quando il post viene nascosto
   */
  readonly hidden = output<number>();

  /**
   * Stato di modifica
   */
  readonly isEditing = signal<boolean>(false);
  readonly editContent = signal<string>('');
  readonly isSaving = signal<boolean>(false);

  /**
   * Stato image preview
   */
  readonly isImagePreviewOpen = signal<boolean>(false);

  /**
   * Contatore commenti locale (aggiornato via WebSocket)
   */
  readonly localCommentsCount = signal<number | null>(null);

  /**
   * Lunghezza massima contenuto
   */
  readonly MAX_CONTENT_LENGTH = 5000;


  /**
   * Verifica se l'utente corrente è l'autore del post
   */
  readonly isOwner = computed(() => {
    return this.authStore.isOwner(this.post().autore.id);
  });

  /**
   * Verifica se l'utente corrente è admin
   */
  readonly isAdmin = computed(() => this.authStore.isAdmin());

  /**
   * Conteggio commenti effettivo (locale o dal post)
   */
  readonly effectiveCommentsCount = computed(() => {
    const local = this.localCommentsCount();
    return local ?? this.post().commentsCount;
  });


  /**
   * Naviga al profilo dell'autore
   */
  goToAuthor(event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/profile', this.post().autore.id]);
  }

  /**
   * Naviga al dettaglio del post
   */
  goToPost(): void {
    if (this.clickable() && !this.isEditing()) {
      this.router.navigate(['/post', this.post().id]);
    }
  }

  /**
   * Apre i commenti (naviga al dettaglio)
   */
  openComments(event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/post', this.post().id], { fragment: 'comments' });
  }

  /**
   * Attiva la modalità modifica
   */
  startEdit(event: Event): void {
    event.stopPropagation();
    this.editContent.set(this.post().contenuto || '');
    this.isEditing.set(true);
  }

  /**
   * Annulla la modifica
   */
  cancelEdit(event: Event): void {
    event.stopPropagation();
    this.isEditing.set(false);
    this.editContent.set('');
  }

  /**
   * Salva le modifiche
   */
  saveEdit(event: Event): void {
    event.stopPropagation();

    const newContent = this.editContent().trim();

    // Validazione
    if (!newContent && !this.post().imageUrl) {
      this.toastService.error('Il post deve contenere testo o un\'immagine');
      return;
    }

    if (newContent.length > this.MAX_CONTENT_LENGTH) {
      this.toastService.error(`Il contenuto non può superare i ${this.MAX_CONTENT_LENGTH} caratteri`);
      return;
    }

    this.isSaving.set(true);

    this.postService.updatePost(this.post().id, { contenuto: newContent }).subscribe({
      next: (updatedPost) => {
        this.isSaving.set(false);
        this.isEditing.set(false);
        this.toastService.success('Post modificato con successo');
        this.edited.emit(updatedPost);
      },
      error: () => {
        this.isSaving.set(false);
        this.toastService.error('Errore nella modifica del post');
      },
    });
  }

  /**
   * Elimina post con conferma
   */
  async deletePost(event: Event): Promise<void> {
    event.stopPropagation();

    const confirmed = await this.dialogService.confirmDangerous({
      title: 'Elimina post',
      message: 'Sei sicuro di voler eliminare questo post? Questa azione non può essere annullata.',
      confirmText: 'Elimina',
      cancelText: 'Annulla',
    });

    if (!confirmed) return;

    this.postService.deletePost(this.post().id).subscribe({
      next: () => {
        this.toastService.success('Post eliminato');
        this.deleted.emit(this.post().id);
      },
      error: () => {
        this.toastService.error("Errore nell'eliminazione del post");
      },
    });
  }

  /**
   * Nascondi post
   */
  hidePost(event: Event): void {
    event.stopPropagation();

    this.postService.hidePost(this.post().id).subscribe({
      next: () => {
        this.toastService.success('Post nascosto');
        this.hidden.emit(this.post().id);
      },
      error: () => {
        this.toastService.error('Errore nel nascondere il post');
      },
    });
  }

  /**
   * Apre l'anteprima dell'immagine
   */
  openImagePreview(event: Event): void {
    event.stopPropagation();
    this.isImagePreviewOpen.set(true);
  }

  /**
   * Chiude l'anteprima dell'immagine
   */
  closeImagePreview(): void {
    this.isImagePreviewOpen.set(false);
  }

  /**
   * Gestisce l'aggiornamento del conteggio commenti via WebSocket
   */
  onCommentsCountChanged(count: number): void {
    this.localCommentsCount.set(count);
  }
}
