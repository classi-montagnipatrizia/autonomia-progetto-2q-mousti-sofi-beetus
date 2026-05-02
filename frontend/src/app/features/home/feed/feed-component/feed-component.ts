import { Component, DestroyRef, inject, OnInit, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { PostCardComponent } from '../../../../shared/components/post-card/post-card-component/post-card-component';
import { SkeletonComponent } from '../../../../shared/ui/skeleton/skeleton-component/skeleton-component';
import { SpinnerComponent } from '../../../../shared/ui/spinner/spinner-component/spinner-component';
import { PostService } from '../../../../core/api/post-service';
import { PostResponseDTO } from '../../../../models';
import { InfiniteScroll } from '../../../../shared/directives/infinite-scroll';
import { CreatePostComponent } from '../../components/create-post/create-post-component/create-post-component';
import { SidebarOnlineComponent } from '../../components/sidebar-online/sidebar-online-component/sidebar-online-component';
import { WebsocketService, PostLikeUpdate, CommentsCountUpdate } from '../../../../core/services/websocket-service';
import { AuthService } from '../../../../core/auth/services/auth-service';
import { AuthStore } from '../../../../core/stores/auth-store';
import { LoggerService } from '../../../../core/services/logger.service';

@Component({
  selector: 'app-feed-component',
  imports: [
    PostCardComponent,
    CreatePostComponent,
    SidebarOnlineComponent,
    SkeletonComponent,
    SpinnerComponent,
    InfiniteScroll
],
  templateUrl: './feed-component.html',
  styleUrl: './feed-component.scss',
})
export class FeedComponent implements OnInit {
  private readonly postService = inject(PostService);
  private readonly websocketService = inject(WebsocketService);
  private readonly authService = inject(AuthService);
  private readonly authStore = inject(AuthStore);
  private readonly logger = inject(LoggerService);
  private readonly destroyRef = inject(DestroyRef);

  // Stato
  readonly posts = signal<PostResponseDTO[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly isLoadingMore = signal<boolean>(false);
  readonly hasMore = signal<boolean>(true);
  readonly error = signal<string>('');

  // Paginazione
  private currentPage = 0;
  private readonly pageSize = 10;

  /**
   * Verifica se ci sono post da mostrare
   */
  readonly isAdmin = computed(() => this.authStore.isAdmin());
  readonly hasPosts = computed(() => this.posts().length > 0);

  /**
   * Verifica se mostrare il messaggio "nessun post"
   */
  readonly showEmptyState = computed(() => {
    return !this.isLoading() && !this.hasPosts() && !this.error();
  });

  ngOnInit(): void {
    this.loadPosts();
    this.subscribeToWebSocketEvents();
  }

  private subscribeToWebSocketEvents(): void {
    this.websocketService.newPosts$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (post: PostResponseDTO) => {
          const currentUser = this.authService.getCurrentUser();
          const isOwnPost = currentUser?.id === post.autore?.id;
          const alreadyExists = this.posts().some(p => p.id === post.id);
          if (!isOwnPost && !alreadyExists) {
            this.posts.update(posts => [post, ...posts]);
          }
        },
        error: (err) => this.logger.error('[Feed] Errore sottoscrizione nuovi post', err),
      });

    this.websocketService.postUpdated$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updatedPost: PostResponseDTO) => {
          this.posts.update(posts =>
            posts.map(p => p.id === updatedPost.id ? { ...p, ...updatedPost } : p)
          );
        },
        error: (err) => this.logger.error('[Feed] Errore sottoscrizione post aggiornati', err),
      });

    this.websocketService.postDeleted$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data: { postId: number }) => {
          this.posts.update(posts => posts.filter(p => p.id !== data.postId));
        },
        error: (err) => this.logger.error('[Feed] Errore sottoscrizione post cancellati', err),
      });

    this.websocketService.postLiked$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (likeUpdate: PostLikeUpdate) => {
          this.posts.update(posts =>
            posts.map(p => p.id === likeUpdate.postId ? { ...p, likesCount: likeUpdate.likesCount } : p)
          );
        },
        error: (err) => this.logger.error('[Feed] Errore sottoscrizione like', err),
      });

    this.websocketService.commentsCount$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (countUpdate: CommentsCountUpdate) => {
          this.posts.update(posts =>
            posts.map(p => p.id === countUpdate.postId ? { ...p, commentsCount: countUpdate.commentsCount } : p)
          );
        },
        error: (err) => this.logger.error('[Feed] Errore sottoscrizione conteggio commenti', err),
      });
  }

  /**
   * Carica i post iniziali
   */
  private loadPosts(): void {
    this.isLoading.set(true);
    this.error.set('');

    this.postService.getFeed(0, this.pageSize)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.posts.set(response.content);
          
          const isLast = response.page !== undefined
            ? response.page.number >= response.page.totalPages - 1
            : response.last || false;
            
          this.hasMore.set(!isLast);
          this.currentPage = 0;
          this.isLoading.set(false);
        },
        error: (err) => {
          this.isLoading.set(false);
          this.error.set('Errore nel caricamento dei post. Riprova.');
          this.logger.error('Errore caricamento feed', err);
        },
      });
  }

  /**
   * Carica altri post (infinite scroll)
   */
  loadMorePosts(): void {
    if (this.isLoadingMore() || !this.hasMore()) {
      return;
    }

    this.isLoadingMore.set(true);

    const nextPage = this.currentPage + 1;

    this.postService.getFeed(nextPage, this.pageSize)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.posts.update((posts) => [...posts, ...response.content]);
          
          const isLast = response.page !== undefined
            ? response.page.number >= response.page.totalPages - 1
            : response.last || false;
            
          this.hasMore.set(!isLast);
          this.currentPage = nextPage;
          this.isLoadingMore.set(false);
        },
        error: (err) => {
          this.isLoadingMore.set(false);
          this.logger.error('Errore caricamento altri post', err);
        },
      });
  }

  /**
   * Gestisce la creazione di un nuovo post
   * Aggiunge il post in cima alla lista
   */
  onPostCreated(post: PostResponseDTO): void {
    this.posts.update((posts) => [post, ...posts]);
  }

  /**
   * Gestisce l'eliminazione di un post
   */
  onPostDeleted(postId: number): void {
    this.posts.update((posts) => posts.filter((p) => p.id !== postId));
  }

  /**
   * Gestisce il nascondimento di un post
   */
  onPostHidden(postId: number): void {
    this.posts.update((posts) => posts.filter((p) => p.id !== postId));
  }

  /**
   * Gestisce la modifica di un post
   */
  onPostEdited(updatedPost: PostResponseDTO): void {
    this.posts.update((posts) =>
      posts.map((p) => (p.id === updatedPost.id ? updatedPost : p))
    );
  }

  /**
   * Ricarica il feed
   */
  refreshFeed(): void {
    this.loadPosts();
  }
}
