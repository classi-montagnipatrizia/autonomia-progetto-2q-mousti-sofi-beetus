import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, ArrowLeft, Search, Users, FileText, X } from 'lucide-angular';
import { Subject, takeUntil, finalize, debounceTime, distinctUntilChanged } from 'rxjs';

import { UserService } from '../../../core/api/user-service';
import { PostService } from '../../../core/api/post-service';
import { WebsocketService } from '../../../core/services/websocket-service';
import { UserSummaryDTO, PostResponseDTO, PageResponse } from '../../../models';
import { AvatarComponent } from '../../../shared/ui/avatar/avatar-component/avatar-component';
import { SkeletonComponent } from '../../../shared/ui/skeleton/skeleton-component/skeleton-component';
import { ButtonComponent } from '../../../shared/ui/button/button-component/button-component';
import { PostCardComponent } from '../../../shared/components/post-card/post-card-component/post-card-component';
import { OnlineUsersStore } from '../../../core/stores/online-users-store';

type SearchTab = 'users' | 'posts';

@Component({
  selector: 'app-search-results-component',
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    AvatarComponent,
    SkeletonComponent,
    ButtonComponent,
    PostCardComponent,
  ],
  templateUrl: './search-results-component.html',
  styleUrl: './search-results-component.scss',
})
export class SearchResultsComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly userService = inject(UserService);
  private readonly postService = inject(PostService);
  private readonly websocketService = inject(WebsocketService);
  private readonly onlineUsersStore = inject(OnlineUsersStore);
  private readonly destroy$ = new Subject<void>();
  private readonly searchSubject = new Subject<string>();

  // Icone
  readonly ArrowLeftIcon = ArrowLeft;
  readonly SearchIcon = Search;
  readonly UsersIcon = Users;
  readonly FileTextIcon = FileText;
  readonly XIcon = X;

  // State
  readonly searchQuery = signal('');
  readonly activeTab = signal<SearchTab>('users');
  readonly isLoading = signal(false);
  readonly isLoadingMore = signal(false);

  // Users results
  readonly users = signal<UserSummaryDTO[]>([]);
  readonly usersPage = signal(0);
  readonly usersTotalPages = signal(0);

  // Posts results
  readonly posts = signal<PostResponseDTO[]>([]);
  readonly postsPage = signal(0);
  readonly postsTotalPages = signal(0);

  // Computed
  readonly hasMoreUsers = computed(() => this.usersPage() < this.usersTotalPages() - 1);
  readonly hasMorePosts = computed(() => this.postsPage() < this.postsTotalPages() - 1);
  readonly isUsersEmpty = computed(() => !this.isLoading() && this.users().length === 0 && this.searchQuery().length > 0);
  readonly isPostsEmpty = computed(() => !this.isLoading() && this.posts().length === 0 && this.searchQuery().length > 0);
  readonly showInitialState = computed(() => this.searchQuery().length === 0);

  ngOnInit(): void {
    // Leggi query params
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const q = params['q'] || '';
        const tab = params['tab'] as SearchTab || 'users';
        
        this.searchQuery.set(q);
        this.activeTab.set(tab);
        
        if (q) {
          this.performSearch(q);
        }
      });

    // Setup debounced search
    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(query => {
        this.updateUrl(query, this.activeTab());
        if (query.length >= 2) {
          this.performSearch(query);
        } else {
          this.clearResults();
        }
      });

    // Subscribe to WebSocket updates for posts
    this.subscribeToPostUpdates();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Gestisce input nella search
   */
  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
    this.searchSubject.next(value);
  }

  /**
   * Pulisce la ricerca
   */
  clearSearch(): void {
    this.searchQuery.set('');
    this.clearResults();
    this.updateUrl('', this.activeTab());
  }

  /**
   * Cambia tab
   */
  setTab(tab: SearchTab): void {
    this.activeTab.set(tab);
    this.updateUrl(this.searchQuery(), tab);
    
    if (this.searchQuery().length >= 2) {
      this.performSearch(this.searchQuery());
    }
  }

  /**
   * Esegue la ricerca
   */
  private performSearch(query: string): void {
    this.isLoading.set(true);
    
    if (this.activeTab() === 'users') {
      this.searchUsers(query, true);
    } else {
      this.searchPosts(query, true);
    }
  }

  /**
   * Cerca utenti
   */
  private searchUsers(query: string, reset = true): void {
    if (reset) {
      this.usersPage.set(0);
      this.users.set([]);
    }

    this.userService.searchUsers(query, this.usersPage(), 20)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoading.set(false);
          this.isLoadingMore.set(false);
        })
      )
      .subscribe({
        next: (response: PageResponse<UserSummaryDTO>) => {
          if (reset) {
            this.users.set(response.content);
          } else {
            this.users.update(current => [...current, ...response.content]);
          }
          this.usersTotalPages.set(response.totalPages);
        }
      });
  }

  /**
   * Cerca post
   */
  private searchPosts(query: string, reset = true): void {
    if (reset) {
      this.postsPage.set(0);
      this.posts.set([]);
    }

    this.postService.searchPosts(query, this.postsPage(), 20)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoading.set(false);
          this.isLoadingMore.set(false);
        })
      )
      .subscribe({
        next: (response: PageResponse<PostResponseDTO>) => {
          if (reset) {
            this.posts.set(response.content);
          } else {
            this.posts.update(current => [...current, ...response.content]);
          }
          this.postsTotalPages.set(response.totalPages);
        }
      });
  }

  /**
   * Carica più risultati
   */
  loadMore(): void {
    if (this.isLoadingMore()) return;

    this.isLoadingMore.set(true);

    if (this.activeTab() === 'users' && this.hasMoreUsers()) {
      this.usersPage.update(p => p + 1);
      this.searchUsers(this.searchQuery(), false);
    } else if (this.activeTab() === 'posts' && this.hasMorePosts()) {
      this.postsPage.update(p => p + 1);
      this.searchPosts(this.searchQuery(), false);
    }
  }

  /**
   * Pulisce i risultati
   */
  private clearResults(): void {
    this.users.set([]);
    this.posts.set([]);
    this.usersPage.set(0);
    this.postsPage.set(0);
    this.isLoading.set(false);
  }

  /**
   * Aggiorna URL con query params
   */
  private updateUrl(query: string, tab: SearchTab): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: query || null, tab },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  /**
   * Naviga al profilo utente
   */
  goToProfile(userId: number): void {
    this.router.navigate(['/profile', userId]);
  }

  /**
   * Controlla se l'utente è online
   */
  isUserOnline(userId: number): boolean {
    return this.onlineUsersStore.isUserOnline(userId);
  }

  /**
   * Torna indietro
   */
  goBack(): void {
    this.router.navigate(['/']);
  }

  /**
   * Gestione post eliminato
   */
  onPostDeleted(postId: number): void {
    this.posts.update(posts => posts.filter(p => p.id !== postId));
  }

  /**
   * Gestione post modificato
   */
  onPostEdited(updatedPost: PostResponseDTO): void {
    this.posts.update(posts =>
      posts.map(p => p.id === updatedPost.id ? updatedPost : p)
    );
  }

  /**
   * Gestione post nascosto
   */
  onPostHidden(postId: number): void {
    this.posts.update(posts => posts.filter(p => p.id !== postId));
  }

  /**
   * Sottoscrizione agli aggiornamenti dei post via WebSocket
   */
  private subscribeToPostUpdates(): void {
    // Aggiornamenti like in tempo reale
    this.websocketService.postLiked$
      .pipe(takeUntil(this.destroy$))
      .subscribe((likeUpdate) => {
        this.posts.update(posts =>
          posts.map(p => {
            if (p.id === likeUpdate.postId) {
              return { ...p, likesCount: likeUpdate.likesCount };
            }
            return p;
          })
        );
      });

    // Aggiornamenti conteggio commenti in tempo reale
    this.websocketService.commentsCount$
      .pipe(takeUntil(this.destroy$))
      .subscribe((countUpdate) => {
        this.posts.update(posts =>
          posts.map(p => {
            if (p.id === countUpdate.postId) {
              return { ...p, commentsCount: countUpdate.commentsCount };
            }
            return p;
          })
        );
      });

    // Post eliminato
    this.websocketService.postDeleted$
      .pipe(takeUntil(this.destroy$))
      .subscribe((event) => {
        this.posts.update(posts => posts.filter(p => p.id !== event.postId));
      });

    // Post modificato
    this.websocketService.postUpdated$
      .pipe(takeUntil(this.destroy$))
      .subscribe((updatedPost) => {
        this.posts.update(posts =>
          posts.map(p => {
            if (p.id === updatedPost.id) {
              return { ...p, contenuto: updatedPost.contenuto, imageUrl: updatedPost.imageUrl, updatedAt: updatedPost.updatedAt };
            }
            return p;
          })
        );
      });
  }
}

