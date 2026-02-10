import { Component, computed, effect, inject, OnDestroy, OnInit, signal, viewChild } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, ArrowLeft, Ellipsis, Pencil, Trash2, X, Check, Heart, MessageCircle, Share2 } from 'lucide-angular';
import { Subscription } from 'rxjs';

import { PostDettaglioResponseDTO, CommentResponseDTO, UserSummaryDTO } from '../../../../models';
import { PostService } from '../../../../core/api/post-service';
import { CommentService } from '../../../../core/api/comment-service';
import { LikeService } from '../../../../core/api/like-service';
import { DialogService } from '../../../../core/services/dialog-service';
import { ToastService } from '../../../../core/services/toast-service';
import { WebsocketService } from '../../../../core/services/websocket-service';
import { AuthStore } from '../../../../core/stores/auth-store';
import { LoggerService } from '../../../../core/services/logger.service';

import { AvatarComponent } from '../../../../shared/ui/avatar/avatar-component/avatar-component';
import { DropdownComponent } from '../../../../shared/ui/dropdown/dropdown-component/dropdown-component';
import { ModalComponent } from '../../../../shared/ui/modal/modal-component/modal-component';
import { CommentComponent } from '../../../../shared/components/comment/comment-component/comment-component';
import { CommentFormComponent } from '../../../../shared/components/comment-form/comment-form-component/comment-form-component';
import { TimeAgoComponent } from '../../../../shared/components/time-ago/time-ago-component/time-ago-component';
import { SafeMentionTextComponent } from '../../../../shared/components/safe-mention-text/safe-mention-text.component';

@Component({
  selector: 'app-post-detail',
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    AvatarComponent,
    DropdownComponent,
    ModalComponent,
    CommentComponent,
    CommentFormComponent,
    TimeAgoComponent,
    SafeMentionTextComponent,
  ],
  templateUrl: './post-detail-component.html',
  styleUrl: './post-detail-component.scss',
})
export class PostDetailComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly postService = inject(PostService);
  private readonly commentService = inject(CommentService);
  private readonly likeService = inject(LikeService);
  private readonly dialogService = inject(DialogService);
  private readonly toastService = inject(ToastService);
  private readonly websocketService = inject(WebsocketService);
  private readonly authStore = inject(AuthStore);
  private readonly logger = inject(LoggerService);

  private readonly subscriptions: Subscription[] = [];

  // Riferimento al form commenti
  readonly commentFormRef = viewChild<CommentFormComponent>('commentForm');

  // Icone Lucide
  readonly ArrowLeftIcon = ArrowLeft;
  readonly EllipsisIcon = Ellipsis;
  readonly PencilIcon = Pencil;
  readonly Trash2Icon = Trash2;
  readonly XIcon = X;
  readonly CheckIcon = Check;
  readonly HeartIcon = Heart;
  readonly MessageCircleIcon = MessageCircle;
  readonly Share2Icon = Share2;

  // ========== STATE ==========

  readonly post = signal<PostDettaglioResponseDTO | null>(null);
  readonly isLoading = signal<boolean>(true);
  readonly error = signal<string | null>(null);

  readonly isEditing = signal<boolean>(false);
  readonly editContent = signal<string>('');
  readonly isSaving = signal<boolean>(false);

  readonly localLikesCount = signal<number>(0);
  readonly localHasLiked = signal<boolean>(false);
  readonly isLiking = signal<boolean>(false);

  readonly replyingTo = signal<CommentResponseDTO | null>(null);

  readonly isImagePreviewOpen = signal<boolean>(false);

  readonly isLikesModalOpen = signal<boolean>(false);
  readonly likesUsers = signal<UserSummaryDTO[]>([]);
  readonly isLoadingLikes = signal<boolean>(false);

  readonly MAX_CONTENT_LENGTH = 5000;

  // ========== COMPUTED ==========

  readonly isOwner = computed(() => {
    const postData = this.post();
    return postData ? this.authStore.isOwner(postData.autore.id) : false;
  });

  readonly isAdmin = computed(() => this.authStore.isAdmin());

  readonly currentUser = computed(() => this.authStore.currentUser());

  readonly comments = computed(() => {
    const postData = this.post();
    return postData?.commenti ?? [];
  });

  constructor() {
    // Sincronizza lo stato locale quando il post cambia
    effect(() => {
      const postData = this.post();
      if (postData) {
        this.localLikesCount.set(postData.likesCount);
        this.localHasLiked.set(postData.hasLiked);
      }
    });
  }

  ngOnInit(): void {
    const postId = Number(this.route.snapshot.paramMap.get('id'));
    if (postId) {
      this.loadPost(postId);
      this.setupWebSocketSubscriptions(postId);
      // Sottoscrivi ai commenti in tempo reale
      this.websocketService.subscribeToPostComments(postId);
    } else {
      this.error.set('ID post non valido');
      this.isLoading.set(false);
    }

    // Scroll ai commenti e focus se richiesto
    const fragment = this.route.snapshot.fragment;
    if (fragment === 'comments') {
      setTimeout(() => {
        document.getElementById('comments-section')?.scrollIntoView({ behavior: 'smooth' });
        // Focus sull'input commenti
        this.commentFormRef()?.focus();
      }, 500);
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    // Cancella sottoscrizione commenti
    const postId = Number(this.route.snapshot.paramMap.get('id'));
    if (postId) {
      this.websocketService.unsubscribeFromPostComments(postId);
    }
  }

  // ========== DATA LOADING ==========

  private loadPost(postId: number): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.postService.getPostById(postId).subscribe({
      next: (post) => {
        this.post.set(post);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.logger.error('Errore caricamento post', err);
        this.error.set('Impossibile caricare il post');
        this.isLoading.set(false);
      }
    });
  }

  private setupWebSocketSubscriptions(postId: number): void {
    // Aggiornamenti like
    this.subscriptions.push(
      this.websocketService.postLiked$.subscribe((update) => {
        if (update.postId === postId) {
          // Aggiorna il conteggio like dal server
          this.localLikesCount.set(update.likesCount);
        }
      })
    );

    // Post modificato
    this.subscriptions.push(
      this.websocketService.postUpdated$.subscribe((updatedPost) => {
        if (updatedPost.id === postId) {
          this.post.update(current => current ? {
            ...current,
            contenuto: updatedPost.contenuto,
            imageUrl: updatedPost.imageUrl,
            updatedAt: updatedPost.updatedAt,
          } : current);
        }
      })
    );

    // Post eliminato
    this.subscriptions.push(
      this.websocketService.postDeleted$.subscribe((event) => {
        if (event.postId === postId) {
          this.toastService.warning('Il post è stato eliminato');
          this.goBack();
        }
      })
    );

    // Aggiornamenti commenti in tempo reale
    this.subscriptions.push(
      this.websocketService.commentUpdates$.subscribe((update) => {
        if (update.postId !== postId) return;

        switch (update.type) {
          case 'comment_created':
            this.handleRemoteCommentCreated(update);
            break;
          case 'comment_updated':
            if (update.comment) {
              this.onCommentUpdated(update.comment);
            }
            break;
          case 'comment_deleted':
            if (update.commentId) {
              this.onCommentDeleted(update.commentId);
            }
            break;
        }
      })
    );
  }

  /**
   * Gestisce un commento creato da un altro utente via WebSocket
   */
  private handleRemoteCommentCreated(update: any): void {
    const currentUserId = this.authStore.userId();
    
    // Ignora se il commento è stato creato dall'utente corrente
    // (già gestito localmente da onCommentCreated)
    if (update.comment?.autore?.id === currentUserId) {
      return;
    }

    this.post.update(current => {
      if (!current) return current;

      let updatedCommenti: CommentResponseDTO[];

      if (update.parentCommentId) {
        // È una risposta: aggiungi come risposta al commento parent
        updatedCommenti = current.commenti.map(c => {
          if (c.id === update.parentCommentId) {
            // Evita duplicati
            if (c.risposte.some(r => r.id === update.comment.id)) {
              return c;
            }
            return { ...c, risposte: [...c.risposte, update.comment] };
          }
          return c;
        });
      } else {
        // È un nuovo commento principale
        // Evita duplicati
        if (current.commenti.some(c => c.id === update.comment.id)) {
          return current;
        }
        updatedCommenti = [update.comment, ...current.commenti];
      }

      return {
        ...current,
        commenti: updatedCommenti,
        commentsCount: current.commentsCount + 1,
      };
    });
  }

  // ========== NAVIGATION ==========

  goBack(): void {
    this.location.back();
  }

  goToAuthor(): void {
    const postData = this.post();
    if (postData) {
      this.router.navigate(['/profile', postData.autore.id]);
    }
  }

  // ========== LIKE ==========

  toggleLike(): void {
    const postData = this.post();
    if (!postData || this.isLiking()) return;

    this.isLiking.set(true);

    // Optimistic update
    const wasLiked = this.localHasLiked();
    this.localHasLiked.set(!wasLiked);
    this.localLikesCount.update(count => wasLiked ? count - 1 : count + 1);

    this.likeService.toggleLike(postData.id).subscribe({
      next: () => {
        this.isLiking.set(false);
      },
      error: (err) => {
        this.logger.error('Errore toggle like', err);
        // Rollback
        this.localHasLiked.set(wasLiked);
        this.localLikesCount.update(count => wasLiked ? count + 1 : count - 1);
        this.isLiking.set(false);
        this.toastService.error('Errore durante il like');
      }
    });
  }

  openLikesModal(): void {
    const postData = this.post();
    const count = this.localLikesCount();

    // Apri il modal solo se ci sono like
    if (!postData || count === 0) return;

    this.isLikesModalOpen.set(true);
    this.loadLikesUsers();
  }

  closeLikesModal(): void {
    this.isLikesModalOpen.set(false);
    this.likesUsers.set([]);
  }

  private loadLikesUsers(): void {
    const postData = this.post();
    if (!postData) return;

    this.isLoadingLikes.set(true);

    this.likeService.getPostLikes(postData.id, 0, 50).subscribe({
      next: (response) => {
        this.likesUsers.set(response.content);
        this.isLoadingLikes.set(false);
      },
      error: (err) => {
        this.logger.error('Errore caricamento likes', err);
        this.isLoadingLikes.set(false);
        this.toastService.error('Errore nel caricamento degli utenti');
      }
    });
  }

  goToUserProfile(username: string): void {
    this.closeLikesModal();
    this.router.navigate(['/profile', username]);
  }

  // ========== EDIT POST ==========

  startEdit(): void {
    const postData = this.post();
    if (postData) {
      this.editContent.set(postData.contenuto || '');
      this.isEditing.set(true);
    }
  }

  cancelEdit(): void {
    this.isEditing.set(false);
    this.editContent.set('');
  }

  async saveEdit(): Promise<void> {
    const postData = this.post();
    const content = this.editContent().trim();

    if (!postData || !content || this.isSaving()) return;

    this.isSaving.set(true);

    this.postService.updatePost(postData.id, { contenuto: content }).subscribe({
      next: (updatedPost) => {
        this.post.update(current => current ? {
          ...current,
          contenuto: updatedPost.contenuto,
          updatedAt: updatedPost.updatedAt,
        } : current);
        this.isEditing.set(false);
        this.isSaving.set(false);
        this.toastService.success('Post modificato');
      },
      error: (err) => {
        this.logger.error('Errore modifica post', err);
        this.isSaving.set(false);
        this.toastService.error('Errore durante la modifica');
      }
    });
  }

  // ========== DELETE POST ==========

  async deletePost(): Promise<void> {
    const postData = this.post();
    if (!postData) return;

    const confirmed = await this.dialogService.confirmDangerous({
      title: 'Elimina post',
      message: 'Sei sicuro di voler eliminare questo post? Questa azione non può essere annullata.',
      confirmText: 'Elimina',
      cancelText: 'Annulla',
    });

    if (!confirmed) return;

    this.postService.deletePost(postData.id).subscribe({
      next: () => {
        this.toastService.success('Post eliminato');
        this.goBack();
      },
      error: (err) => {
        this.logger.error('Errore eliminazione post', err);
        this.toastService.error('Errore durante l\'eliminazione');
      }
    });
  }

  // ========== COMMENTS ==========

  onReply(comment: CommentResponseDTO): void {
    this.replyingTo.set(comment);
  }

  onCancelReply(): void {
    this.replyingTo.set(null);
  }

  onCommentCreated(newComment: CommentResponseDTO): void {
    const replyTo = this.replyingTo();
    
    this.post.update(current => {
      if (!current) return current;

      let updatedCommenti: CommentResponseDTO[];

      if (replyTo) {
        // È una risposta: aggiungi come risposta al commento parent
        updatedCommenti = current.commenti.map(c => {
          if (c.id === replyTo.id) {
            return { ...c, risposte: [...c.risposte, newComment] };
          }
          // Controlla anche nelle risposte di primo livello
          if (c.risposte.some(r => r.id === replyTo.id)) {
            return {
              ...c,
              risposte: c.risposte.map(r =>
                r.id === replyTo.id
                  ? { ...r, risposte: [...r.risposte, newComment] }
                  : r
              )
            };
          }
          return c;
        });
      } else {
        // È un nuovo commento principale
        updatedCommenti = [newComment, ...current.commenti];
      }

      return {
        ...current,
        commenti: updatedCommenti,
        commentsCount: current.commentsCount + 1,
      };
    });

    this.replyingTo.set(null);
    this.toastService.success(replyTo ? 'Risposta inviata' : 'Commento aggiunto');
  }

  /**
   * Gestisce l'eliminazione di un commento da parte dell'utente corrente (evento locale).
   * Rimuove solo dalla UI in modo optimistic, il contatore verrà aggiornato via WebSocket.
   */
  onCommentDeletedByUser(commentId: number): void {
    this.post.update(current => {
      if (!current) return current;

      // Rimuovi solo dalla UI, NON toccare il contatore
      // Il contatore verrà aggiornato via WebSocket
      const updatedCommenti = current.commenti
        .filter(c => c.id !== commentId)
        .map(c => ({
          ...c,
          risposte: c.risposte.filter(r => r.id !== commentId)
        }));

      return {
        ...current,
        commenti: updatedCommenti,
        // NON aggiorniamo commentsCount qui, arriverà via WebSocket
      };
    });
  }

  /**
   * Gestisce l'eliminazione di un commento ricevuta via WebSocket.
   * Rimuove dalla UI e decrementa il contatore.
   */
  onCommentDeleted(commentId: number): void {
    this.post.update(current => {
      if (!current) return current;

      // Rimuovi il commento o la risposta
      const updatedCommenti = current.commenti
        .filter(c => c.id !== commentId)
        .map(c => ({
          ...c,
          risposte: c.risposte.filter(r => r.id !== commentId)
        }));

      return {
        ...current,
        commenti: updatedCommenti,
        commentsCount: Math.max(0, current.commentsCount - 1),
      };
    });
  }

  onCommentUpdated(updatedComment: CommentResponseDTO): void {
    this.post.update(current => {
      if (!current) return current;

      const updatedCommenti = current.commenti.map(c => {
        if (c.id === updatedComment.id) {
          // Preserva le risposte esistenti, aggiorna solo contenuto e timestamp
          return { 
            ...c, 
            contenuto: updatedComment.contenuto,
            updatedAt: updatedComment.updatedAt 
          };
        }
        return {
          ...c,
          risposte: c.risposte.map(r =>
            r.id === updatedComment.id 
              ? { ...r, contenuto: updatedComment.contenuto, updatedAt: updatedComment.updatedAt } 
              : r
          )
        };
      });

      return { ...current, commenti: updatedCommenti };
    });
  }

  // ========== SHARE ==========

  async sharePost(): Promise<void> {
    const postData = this.post();
    if (!postData) return;

    const url = globalThis.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Condividi post',
          text: postData.contenuto || 'Dai un\'occhiata a questo post!',
          url: url,
        });
      } catch (err) {
        this.logger.error('Errore condivisione', err);
      }
    } else {
      // Fallback: copia negli appunti
      try {
        await navigator.clipboard.writeText(url);
        this.toastService.success('Link copiato negli appunti');
      } catch {
        this.toastService.error('Impossibile copiare il link');
      }
    }
  }

  /**
   * Apre l'anteprima dell'immagine
   */
  openImagePreview(): void {
    this.isImagePreviewOpen.set(true);
  }

  /**
   * Chiude l'anteprima dell'immagine
   */
  closeImagePreview(): void {
    this.isImagePreviewOpen.set(false);
  }

  /**
   * Focus sull'input commenti e scroll alla sezione commenti
   */
  focusCommentInput(): void {
    document.getElementById('comments-section')?.scrollIntoView({ behavior: 'smooth' });
    this.commentFormRef()?.focus();
  }
}
