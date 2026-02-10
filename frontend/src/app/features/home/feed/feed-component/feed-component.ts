import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
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
import { OnlineUsersDrawerComponent } from '../../components/online-users-drawer/online-users-drawer-component/online-users-drawer-component';
import { LoggerService } from '../../../../core/services/logger.service';

@Component({
  selector: 'app-feed-component',
  imports: [
    CommonModule,
    PostCardComponent,
    CreatePostComponent,
    SidebarOnlineComponent,
    OnlineUsersDrawerComponent,
    SkeletonComponent,
    SpinnerComponent,
    InfiniteScroll,
  ],
  templateUrl: './feed-component.html',
  styleUrl: './feed-component.scss',
})
export class FeedComponent implements OnInit, OnDestroy {
  private readonly postService = inject(PostService);
  private readonly websocketService = inject(WebsocketService);
  private readonly authService = inject(AuthService);
  private readonly logger = inject(LoggerService);

  private newPostSubscription?: Subscription;
  private postUpdatedSubscription?: Subscription;
  private postDeletedSubscription?: Subscription;
  private postLikedSubscription?: Subscription;
  private commentsCountSubscription?: Subscription;

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
  readonly hasPosts = computed(() => this.posts().length > 0);

  /**
   * Verifica se mostrare il messaggio "nessun post"
   */
  readonly showEmptyState = computed(() => {
    return !this.isLoading() && !this.hasPosts() && !this.error();
  });

  ngOnInit(): void {
    this.loadPosts();
    this.subscribeToNewPosts();
    this.subscribeToPostUpdates();
    this.subscribeToPostDeletes();
    this.subscribeToPostLikes();
    this.subscribeToCommentsCount();
  }

  ngOnDestroy(): void {
    this.newPostSubscription?.unsubscribe();
    this.postUpdatedSubscription?.unsubscribe();
    this.postDeletedSubscription?.unsubscribe();
    this.postLikedSubscription?.unsubscribe();
    this.commentsCountSubscription?.unsubscribe();
  }

  /**
   * Sottoscrizione ai nuovi post via WebSocket
   * I post degli altri utenti appaiono in tempo reale
   */
  private subscribeToNewPosts(): void {
    this.newPostSubscription = this.websocketService.newPosts$.subscribe({
      next: (post: PostResponseDTO) => {
        // Evita duplicati: non aggiungere se è il nostro post (già aggiunto da onPostCreated)
        // o se il post è già presente nella lista
        const currentUser = this.authService.getCurrentUser();
        const isOwnPost = currentUser?.id === post.autore?.id;
        const alreadyExists = this.posts().some(p => p.id === post.id);

        if (!isOwnPost && !alreadyExists) {
          this.posts.update(posts => [post, ...posts]);
        }
      },
      error: (err) => {
        this.logger.error('[Feed] Errore sottoscrizione nuovi post', err);
      }
    });
  }

  /**
   * Sottoscrizione agli aggiornamenti dei post via WebSocket
   * I post modificati vengono aggiornati in tempo reale
   */
  private subscribeToPostUpdates(): void {
    this.postUpdatedSubscription = this.websocketService.postUpdated$.subscribe({
      next: (updatedPost: PostResponseDTO) => {
        this.posts.update(posts =>
          posts.map(p => p.id === updatedPost.id ? { ...p, ...updatedPost } : p)
        );
      },
      error: (err) => {
        this.logger.error('[Feed] Errore sottoscrizione post aggiornati', err);
      }
    });
  }

  /**
   * Sottoscrizione alle cancellazioni dei post via WebSocket
   * I post eliminati vengono rimossi in tempo reale
   */
  private subscribeToPostDeletes(): void {
    this.postDeletedSubscription = this.websocketService.postDeleted$.subscribe({
      next: (data: { postId: number }) => {
        this.posts.update(posts => posts.filter(p => p.id !== data.postId));
      },
      error: (err) => {
        this.logger.error('[Feed] Errore sottoscrizione post cancellati', err);
      }
    });
  }

  /**
   * Sottoscrizione agli aggiornamenti dei like via WebSocket
   * Il conteggio dei like viene aggiornato in tempo reale
   */
  private subscribeToPostLikes(): void {
    this.postLikedSubscription = this.websocketService.postLiked$.subscribe({
      next: (likeUpdate: PostLikeUpdate) => {
        this.posts.update(posts =>
          posts.map(p => {
            if (p.id === likeUpdate.postId) {
              return { ...p, likesCount: likeUpdate.likesCount };
            }
            return p;
          })
        );
      },
      error: (err) => {
        this.logger.error('[Feed] Errore sottoscrizione like', err);
      }
    });
  }

  /**
   * Sottoscrizione agli aggiornamenti del conteggio commenti via WebSocket
   * Il conteggio dei commenti viene aggiornato in tempo reale
   */
  private subscribeToCommentsCount(): void {
    this.commentsCountSubscription = this.websocketService.commentsCount$.subscribe({
      next: (countUpdate: CommentsCountUpdate) => {
        this.posts.update(posts =>
          posts.map(p => {
            if (p.id === countUpdate.postId) {
              return { ...p, commentsCount: countUpdate.commentsCount };
            }
            return p;
          })
        );
      },
      error: (err) => {
        this.logger.error('[Feed] Errore sottoscrizione conteggio commenti', err);
      }
    });
  }

  /**
   * Carica i post iniziali
   */
  private loadPosts(): void {
    this.isLoading.set(true);
    this.error.set('');

    this.postService.getFeed(0, this.pageSize).subscribe({
      next: (response) => {
        this.posts.set(response.content);
        this.hasMore.set(!response.last);
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

    this.postService.getFeed(nextPage, this.pageSize).subscribe({
      next: (response) => {
        this.posts.update((posts) => [...posts, ...response.content]);
        this.hasMore.set(!response.last);
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

  /**
   * Track function per ngFor
   */
  trackByPostId(index: number, post: PostResponseDTO): number {
    return post.id;
  }
}
