import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideAngularModule, Settings, ImageIcon, ArrowLeft, X } from 'lucide-angular';
import { Subject, takeUntil, forkJoin, finalize } from 'rxjs';

import { UserService } from '../../../core/api/user-service';
import { PostService } from '../../../core/api/post-service';
import { AuthStore } from '../../../core/stores/auth-store';
import { OnlineUsersStore } from '../../../core/stores/online-users-store';
import {
  UserResponseDTO,
  UserStats,
  PostResponseDTO,
  PageResponse,
} from '../../../models';
import { AvatarComponent } from '../../../shared/ui/avatar/avatar-component/avatar-component';
import { SkeletonComponent } from '../../../shared/ui/skeleton/skeleton-component/skeleton-component';
import { PostCardComponent } from '../../../shared/components/post-card/post-card-component/post-card-component';
import { InfiniteScroll } from '../../../shared/directives/infinite-scroll';
import { SpinnerComponent } from '../../../shared/ui/spinner/spinner-component/spinner-component';
import { LoggerService } from '../../../core/services/logger.service';

type ProfileTab = 'posts' | 'media';

@Component({
  selector: 'app-profile-component',
  imports: [
    CommonModule,
    LucideAngularModule,
    AvatarComponent,
    SkeletonComponent,
    PostCardComponent,
    InfiniteScroll,
    SpinnerComponent,
  ],
  templateUrl: './profile-view-component.html',
  styleUrl: './profile-view-component.scss',
})
export class ProfileComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  readonly router = inject(Router);
  private readonly userService = inject(UserService);
  private readonly postService = inject(PostService);
  private readonly authStore = inject(AuthStore);
  private readonly onlineUsersStore = inject(OnlineUsersStore);
  private readonly logger = inject(LoggerService);
  private readonly destroy$ = new Subject<void>();

  // Icons
  readonly SettingsIcon = Settings;
  readonly ImageIcon = ImageIcon;
  readonly ArrowLeftIcon = ArrowLeft;
  readonly XIcon = X;

  // State
  readonly user = signal<UserResponseDTO | null>(null);
  readonly stats = signal<UserStats | null>(null);
  readonly posts = signal<PostResponseDTO[]>([]);
  readonly activeTab = signal<ProfileTab>('posts');
  readonly isLoading = signal(true);
  readonly isLoadingPosts = signal(false);
  readonly isLoadingMore = signal(false);
  readonly error = signal<string | null>(null);

  // Image preview state per tab Media
  readonly selectedImageUrl = signal<string | null>(null);

  // Profile picture viewer state
  readonly isProfilePictureViewerOpen = signal(false);

  // Pagination
  readonly postsPage = signal(0);
  readonly postsTotalPages = signal(0);

  // Computed
  readonly isOwnProfile = computed(() => {
    const currentUser = this.authStore.currentUser();
    const profileUser = this.user();
    return currentUser && profileUser && currentUser.id === profileUser.id;
  });

  readonly isOnline = computed(() => {
    const profileUser = this.user();
    if (!profileUser) return false;
    return this.onlineUsersStore.isUserOnline(profileUser.id);
  });

  readonly hasMorePosts = computed(
    () => this.postsPage() < this.postsTotalPages() - 1
  );

  readonly mediaPosts = computed(() =>
    this.posts().filter((post) => post.imageUrl)
  );

  readonly formattedPostsCount = computed(() => {
    const count = this.stats()?.postsCount ?? 0;
    return this.formatCount(count);
  });

  readonly formattedLikesCount = computed(() => {
    const count = this.stats()?.likesReceivedCount ?? 0;
    return this.formatCount(count);
  });

  readonly formattedCommentsCount = computed(() => {
    const count = this.stats()?.commentsCount ?? 0;
    return this.formatCount(count);
  });

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const userId = params.get('id');
      if (userId) {
        const parsedId = Number(userId);

        if (Number.isFinite(parsedId)) {
          this.loadProfile(parsedId);
        } else {
          // Param non numerico (es: username da menzione) → evita chiamate NaN al backend
          this.error.set('Profilo non valido');
          this.router.navigate(['/search'], {
            queryParams: { q: userId, tab: 'users' },
          });
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadProfile(userId: number): void {
    this.isLoading.set(true);
    this.error.set(null);
    this.posts.set([]);
    this.postsPage.set(0);

    forkJoin({
      user: this.userService.getUserProfile(userId),
      stats: this.userService.getUserStats(userId),
    })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: ({ user, stats }) => {
          this.user.set(user);
          this.stats.set(stats);
          this.loadPosts(userId, true);
        },
        error: (err) => {
          this.logger.error('Error loading profile', err);
          this.error.set('Impossibile caricare il profilo');
        },
      });
  }

  private loadPosts(userId: number, reset = true): void {
    if (reset) {
      this.isLoadingPosts.set(true);
      this.postsPage.set(0);
      this.posts.set([]);
    }

    this.postService
      .getUserPosts(userId, this.postsPage(), 10)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoadingPosts.set(false);
          this.isLoadingMore.set(false);
        })
      )
      .subscribe({
        next: (response: PageResponse<PostResponseDTO>) => {
          if (reset) {
            this.posts.set(response.content);
          } else {
            this.posts.update((current) => [...current, ...response.content]);
          }
          this.postsTotalPages.set(response.totalPages);
        },
        error: (err) => {
          this.logger.error('Error loading posts', err);
        },
      });
  }

  setTab(tab: ProfileTab): void {
    this.activeTab.set(tab);
  }

  loadMorePosts(): void {
    const profileUser = this.user();
    if (this.isLoadingMore() || !this.hasMorePosts() || !profileUser) return;

    this.isLoadingMore.set(true);
    this.postsPage.update((p) => p + 1);
    this.loadPosts(profileUser.id, false);
  }

  goToSettings(): void {
    this.router.navigate(['/settings']);
  }

  goBack(): void {
    this.router.navigate(['/']);
  }

  onPostDeleted(postId: number): void {
    this.posts.update((posts) => posts.filter((p) => p.id !== postId));
    // Update stats
    this.stats.update((stats) => {
      if (!stats) return stats;
      return { ...stats, postsCount: Math.max(0, stats.postsCount - 1) };
    });
  }

  onPostEdited(updatedPost: PostResponseDTO): void {
    this.posts.update((posts) =>
      posts.map((p) => (p.id === updatedPost.id ? updatedPost : p))
    );
  }

  onPostHidden(postId: number): void {
    this.posts.update((posts) => posts.filter((p) => p.id !== postId));
  }

  private formatCount(count: number): string {
    if (count >= 1000000) {
      return (count / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (count >= 1000) {
      return (count / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    }
    return count.toString();
  }

  /**
   * Apre l'anteprima dell'immagine (tab Media)
   */
  openImagePreview(imageUrl: string): void {
    this.selectedImageUrl.set(imageUrl);
  }

  /**
   * Chiude l'anteprima dell'immagine
   */
  closeImagePreview(): void {
    this.selectedImageUrl.set(null);
  }

  /**
   * Apre il viewer della foto profilo
   */
  openProfilePictureViewer(): void {
    const profileUser = this.user();
    // Apri solo se c'è una foto profilo
    if (profileUser?.profilePictureUrl) {
      this.isProfilePictureViewerOpen.set(true);
    }
  }

  /**
   * Chiude il viewer della foto profilo
   */
  closeProfilePictureViewer(): void {
    this.isProfilePictureViewerOpen.set(false);
  }
}
