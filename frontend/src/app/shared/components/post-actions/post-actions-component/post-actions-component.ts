import { Component, input, output, signal, computed, inject, effect } from '@angular/core';
import { Router } from '@angular/router';
import { LucideAngularModule, Heart, MessageCircle } from 'lucide-angular';

import { LikeService } from '../../../../core/api/like-service';
import { ToastService } from '../../../../core/services/toast-service';
import { DebounceClick } from '../../../directives/debounce-click';

/**
 * Componente per visualizzare e gestire le azioni sui post
 * (like, commenti)
 *
 * Può essere riutilizzato in post-card e post-detail.
 *
 * Nota: il contatore commenti viene aggiornato dal parent (feed/profile/search)
 * tramite l'input {@code commentsCount}. La sottoscrizione WebSocket
 * {@code commentsCount$} è centralizzata lì per evitare N sub identiche (una per post).
 */
@Component({
  selector: 'app-post-actions',
  imports: [LucideAngularModule, DebounceClick],
  templateUrl: './post-actions-component.html',
  styleUrl: './post-actions-component.scss',
})
export class PostActionsComponent {
  private readonly router = inject(Router);
  private readonly likeService = inject(LikeService);
  private readonly toastService = inject(ToastService);

  // Icone Lucide
  readonly HeartIcon = Heart;
  readonly MessageCircleIcon = MessageCircle;


  /**
   * ID del post
   */
  readonly postId = input.required<number>();

  /**
   * Numero di like
   */
  readonly likesCount = input.required<number>();

  /**
   * Numero di commenti
   */
  readonly commentsCount = input.required<number>();

  /**
   * Se l'utente corrente ha messo like
   */
  readonly hasLiked = input.required<boolean>();

  /**
   * Mostra il pulsante dei commenti
   * @default true
   */
  readonly showComments = input<boolean>(true);

  /**
   * Mostra il pulsante dei like
   * @default true
   */
  readonly showLike = input<boolean>(true);


  /**
   * Emesso quando il like viene toggled
   * Contiene il nuovo stato (liked: boolean, likesCount: number)
   */
  readonly likeToggled = output<{ liked: boolean; likesCount: number }>();

  // Stato locale per like (optimistic update)
  readonly localHasLiked = signal<boolean | null>(null);
  readonly localLikesCount = signal<number | null>(null);
  readonly isLikeLoading = signal(false);

  constructor() {
    // Sincronizza il conteggio like quando cambia dall'esterno (es. WebSocket update)
    // Manteniamo lo stato hasLiked dell'utente, ma aggiorniamo il conteggio
    effect(() => {
      const parentLikesCount = this.likesCount();
      const localCount = this.localLikesCount();
      
      // Se il parent ha un valore diverso dal nostro stato locale (e non stiamo caricando),
      // significa che è arrivato un update esterno (WebSocket) - aggiorniamo solo il conteggio
      if (localCount !== null && !this.isLikeLoading() && parentLikesCount !== localCount) {
        // Aggiorna solo il conteggio, NON lo stato hasLiked (quello dell'utente resta invariato)
        this.localLikesCount.set(parentLikesCount);
      }
    });
  }


  /**
   * Stato like effettivo (locale o dal parent)
   */
  readonly effectiveHasLiked = computed(() => {
    const local = this.localHasLiked();
    return local ?? this.hasLiked();
  });

  /**
   * Conteggio like effettivo (locale o dal parent)
   */
  readonly effectiveLikesCount = computed(() => {
    const local = this.localLikesCount();
    return local ?? this.likesCount();
  });

  /**
   * Conteggio commenti effettivo: legge direttamente dall'input controllato dal parent.
   * Manteniamo il computed (anche se diventa un pass-through) per non rompere il template.
   */
  readonly effectiveCommentsCount = computed(() => this.commentsCount());

  /**
   * Toggle like con optimistic update
   */
  toggleLike(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    if (this.isLikeLoading()) return;

    // Optimistic update
    const currentHasLiked = this.effectiveHasLiked();
    const currentLikesCount = this.effectiveLikesCount();

    this.localHasLiked.set(!currentHasLiked);
    this.localLikesCount.set(currentHasLiked ? currentLikesCount - 1 : currentLikesCount + 1);
    this.isLikeLoading.set(true);

    this.likeService.toggleLike(this.postId()).subscribe({
      next: (response) => {
        // Aggiorna con i dati reali dal server
        this.localHasLiked.set(response.liked);
        this.localLikesCount.set(response.likesCount);
        this.isLikeLoading.set(false);

        // Emetti evento al parent
        this.likeToggled.emit({
          liked: response.liked,
          likesCount: response.likesCount,
        });
      },
      error: () => {
        // Rollback in caso di errore
        this.localHasLiked.set(currentHasLiked);
        this.localLikesCount.set(currentLikesCount);
        this.isLikeLoading.set(false);
        this.toastService.error('Errore nel mettere like');
      },
    });
  }

  /**
   * Apre i commenti (naviga al dettaglio)
   */
  openComments(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.router.navigate(['/post', this.postId()], { fragment: 'comments' });
  }
}
