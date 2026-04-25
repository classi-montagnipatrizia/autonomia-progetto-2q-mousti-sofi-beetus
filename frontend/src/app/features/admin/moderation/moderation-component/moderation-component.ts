import { Component, DestroyRef, inject, signal, computed, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  LucideAngularModule,
  ArrowLeft,
  Shield,
  FileText,
  MessageSquare,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Loader2,
  Eye,
  Clock,
  BookOpen,
  UsersRound,
} from 'lucide-angular';
import { Subject, finalize, debounceTime, distinctUntilChanged } from 'rxjs';

import { AdminService, AdminBookDTO, AdminCommentDTO, AdminGroupDTO } from '../../../../core/api/admin-service';
import { PostService } from '../../../../core/api/post-service';
import { ToastService } from '../../../../core/services/toast-service';
import { DialogService } from '../../../../core/services/dialog-service';
import { ButtonComponent } from '../../../../shared/ui/button/button-component/button-component';
import { AvatarComponent } from '../../../../shared/ui/avatar/avatar-component/avatar-component';
import { PostResponseDTO, PageResponse } from '../../../../models';
import { TimeAgoComponent } from '../../../../shared/components/time-ago/time-ago-component/time-ago-component';

type ContentTab = 'posts' | 'comments' | 'books' | 'groups';

@Component({
  selector: 'app-moderation-component',
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    LucideAngularModule,
    ButtonComponent,
    AvatarComponent,
    TimeAgoComponent,
  ],
  templateUrl: './moderation-component.html',
  styleUrl: './moderation-component.scss',
})
export class ModerationComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly adminService = inject(AdminService);
  private readonly postService = inject(PostService);
  private readonly toastService = inject(ToastService);
  private readonly dialogService = inject(DialogService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly searchSubject$ = new Subject<string>();

  // Icone
  readonly ArrowLeftIcon = ArrowLeft;
  readonly ShieldIcon = Shield;
  readonly FileTextIcon = FileText;
  readonly MessageSquareIcon = MessageSquare;
  readonly Trash2Icon = Trash2;
  readonly SearchIcon = Search;
  readonly ChevronLeftIcon = ChevronLeft;
  readonly ChevronRightIcon = ChevronRight;
  readonly AlertCircleIcon = AlertCircle;
  readonly LoaderIcon = Loader2;
  readonly EyeIcon = Eye;
  readonly ClockIcon = Clock;
  readonly BookOpenIcon = BookOpen;
  readonly UsersRoundIcon = UsersRound;

  // State
  readonly activeTab = signal<ContentTab>('posts');
  readonly isLoading = signal(true);
  readonly hasError = signal(false);
  readonly posts = signal<PostResponseDTO[]>([]);
  readonly comments = signal<AdminCommentDTO[]>([]);
  readonly books = signal<AdminBookDTO[]>([]);
  readonly groups = signal<AdminGroupDTO[]>([]);
  readonly searchQuery = signal('');
  readonly processingId = signal<number | null>(null);

  // Paginazione
  readonly currentPage = signal(0);
  readonly totalPages = signal(0);
  readonly totalElements = signal(0);
  readonly pageSize = 10;

  // Computed
  readonly hasPosts = computed(() => this.posts().length > 0);
  readonly hasComments = computed(() => this.comments().length > 0);
  readonly hasBooks = computed(() => this.books().length > 0);
  readonly hasGroups = computed(() => this.groups().length > 0);
  readonly hasContent = computed(() => {
    const tab = this.activeTab();
    if (tab === 'posts') return this.hasPosts();
    if (tab === 'comments') return this.hasComments();
    if (tab === 'books') return this.hasBooks();
    if (tab === 'groups') return this.hasGroups();
    return false;
  });
  readonly isFirstPage = computed(() => this.currentPage() === 0);
  readonly isLastPage = computed(() => this.currentPage() >= this.totalPages() - 1);

  // Tabs
  readonly tabs: { id: ContentTab; label: string; icon: typeof FileText }[] = [
    { id: 'posts', label: 'Post', icon: FileText },
    { id: 'comments', label: 'Commenti', icon: MessageSquare },
    { id: 'books', label: 'Annunci', icon: BookOpen },
    { id: 'groups', label: 'Gruppi', icon: UsersRound },
  ];

  ngOnInit(): void {
    this.setupSearch();
    this.loadContent();
  }

  /**
   * Configura debounce sulla ricerca
   */
  private setupSearch(): void {
    this.searchSubject$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((query) => {
        this.currentPage.set(0);
        if (query.trim() && this.activeTab() === 'posts') {
          this.searchContent(query);
        } else {
          this.loadContent();
        }
      });
  }

  /**
   * Carica contenuti in base al tab attivo
   */
  loadContent(): void {
    switch (this.activeTab()) {
      case 'posts':
        this.loadPosts();
        break;
      case 'comments':
        this.loadComments();
        break;
      case 'books':
        this.loadBooks();
        break;
      case 'groups':
        this.loadGroups();
        break;
    }
  }

  /**
   * Carica lista post
   */
  loadPosts(): void {
    this.isLoading.set(true);
    this.hasError.set(false);

    this.postService.getFeed(this.currentPage(), this.pageSize)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: (response) => {
          this.posts.set(response.content);
          this.totalPages.set(response.totalPages);
          this.totalElements.set(response.totalElements);
        },
        error: () => {
          this.hasError.set(true);
          this.toastService.error('Errore nel caricamento dei post');
        }
      });
  }

  /**
   * Carica lista commenti
   */
  loadComments(): void {
    this.isLoading.set(true);
    this.hasError.set(false);

    this.adminService.getAllComments(this.currentPage(), this.pageSize)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: (response) => {
          this.comments.set(response.content);
          this.totalPages.set(response.totalPages);
          this.totalElements.set(response.totalElements);
        },
        error: () => {
          this.hasError.set(true);
          this.toastService.error('Errore nel caricamento dei commenti');
        }
      });
  }

  /**
   * Elimina commento come admin
   */
  async deleteComment(comment: AdminCommentDTO): Promise<void> {
    const confirmed = await this.dialogService.confirmDangerous({
      title: 'Elimina commento',
      message: `Sei sicuro di voler eliminare questo commento di "${comment.autore.username}"? L'azione non può essere annullata.`,
      confirmText: 'Elimina',
      cancelText: 'Annulla',
    });

    if (!confirmed) return;

    this.processingId.set(comment.id);

    this.adminService.deleteComment(comment.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.processingId.set(null))
      )
      .subscribe({
        next: () => {
          this.toastService.success('Commento eliminato');
          this.comments.update(comments => comments.filter(c => c.id !== comment.id));
          this.totalElements.update(n => n - 1);
        },
        error: () => {
          this.toastService.error('Errore durante l\'eliminazione');
        }
      });
  }

  /**
   * Cerca contenuti
   */
  searchContent(query: string): void {
    this.isLoading.set(true);
    this.hasError.set(false);

    this.postService.searchPosts(query, this.currentPage(), this.pageSize)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: (response) => {
          this.posts.set(response.content);
          this.totalPages.set(response.totalPages);
          this.totalElements.set(response.totalElements);
        },
        error: () => {
          this.hasError.set(true);
          this.toastService.error('Errore nella ricerca');
        }
      });
  }

  /**
   * Cambia tab
   */
  setTab(tab: ContentTab): void {
    this.activeTab.set(tab);
    this.currentPage.set(0);
    this.searchQuery.set('');
    this.loadContent();
  }

  /**
   * Handler ricerca
   */
  onSearch(event: Event): void {
    const query = (event.target as HTMLInputElement).value;
    this.searchQuery.set(query);
    this.searchSubject$.next(query);
  }

  /**
   * Elimina post come admin
   */
  async deletePost(post: PostResponseDTO): Promise<void> {
    const confirmed = await this.dialogService.confirmDangerous({
      title: 'Elimina post',
      message: `Sei sicuro di voler eliminare questo post di "${post.autore.username}"? L'azione non può essere annullata.`,
      confirmText: 'Elimina',
      cancelText: 'Annulla',
    });

    if (!confirmed) return;

    this.processingId.set(post.id);

    this.adminService.deletePost(post.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.processingId.set(null))
      )
      .subscribe({
        next: () => {
          this.toastService.success('Post eliminato');
          this.posts.update(posts => posts.filter(p => p.id !== post.id));
          this.totalElements.update(n => n - 1);
        },
        error: () => {
          this.toastService.error('Errore durante l\'eliminazione');
        }
      });
  }

  /**
   * Elimina tutti i post di un utente
   */
  async deleteAllUserPosts(post: PostResponseDTO): Promise<void> {
    const confirmed = await this.dialogService.confirmDangerous({
      title: 'Elimina tutti i post',
      message: `Sei sicuro di voler eliminare TUTTI i post di "${post.autore.username}"? L'azione non può essere annullata.`,
      confirmText: 'Elimina tutti',
      cancelText: 'Annulla',
    });

    if (!confirmed) return;

    this.processingId.set(post.id);

    this.adminService.deleteAllUserPosts(post.autore.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.processingId.set(null))
      )
      .subscribe({
        next: (response) => {
          this.toastService.success(`${response.deletedCount} post eliminati`);
          // Rimuovi tutti i post di questo utente dalla lista
          this.posts.update(posts => posts.filter(p => p.autore.id !== post.autore.id));
          this.loadContent(); // Ricarica per aggiornare i conteggi
        },
        error: () => {
          this.toastService.error('Errore durante l\'eliminazione');
        }
      });
  }

  // =========================================================================
  // ANNUNCI LIBRO
  // =========================================================================

  /**
   * Carica lista libri
   */
  loadBooks(): void {
    this.isLoading.set(true);
    this.hasError.set(false);

    this.adminService.getAllBooks(this.currentPage(), this.pageSize)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: (response) => {
          this.books.set(response.content);
          this.totalPages.set(response.totalPages);
          this.totalElements.set(response.totalElements);
        },
        error: () => {
          this.hasError.set(true);
          this.toastService.error('Errore nel caricamento degli annunci');
        }
      });
  }

  /**
   * Elimina annuncio libro come admin
   */
  async deleteBook(book: AdminBookDTO): Promise<void> {
    const confirmed = await this.dialogService.confirmDangerous({
      title: 'Elimina annuncio',
      message: `Sei sicuro di voler eliminare l'annuncio "${book.titolo}" di "${book.venditore.username}"? L'azione non può essere annullata.`,
      confirmText: 'Elimina',
      cancelText: 'Annulla',
    });

    if (!confirmed) return;

    this.processingId.set(book.id);

    this.adminService.deleteBook(book.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.processingId.set(null))
      )
      .subscribe({
        next: () => {
          this.toastService.success('Annuncio eliminato');
          this.books.update(books => books.filter(b => b.id !== book.id));
          this.totalElements.update(n => n - 1);
        },
        error: () => {
          this.toastService.error('Errore durante l\'eliminazione');
        }
      });
  }

  // =========================================================================
  // GRUPPI
  // =========================================================================

  /**
   * Carica lista gruppi
   */
  loadGroups(): void {
    this.isLoading.set(true);
    this.hasError.set(false);

    this.adminService.getAllGroups(this.currentPage(), this.pageSize)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: (response) => {
          this.groups.set(response.content);
          this.totalPages.set(response.totalPages);
          this.totalElements.set(response.totalElements);
        },
        error: () => {
          this.hasError.set(true);
          this.toastService.error('Errore nel caricamento dei gruppi');
        }
      });
  }

  /**
   * Elimina gruppo come admin
   */
  async deleteGroup(group: AdminGroupDTO): Promise<void> {
    const confirmed = await this.dialogService.confirmDangerous({
      title: 'Elimina gruppo',
      message: `Sei sicuro di voler eliminare il gruppo "${group.name}"? Tutti i messaggi e membri verranno rimossi. L'azione non può essere annullata.`,
      confirmText: 'Elimina',
      cancelText: 'Annulla',
    });

    if (!confirmed) return;

    this.processingId.set(group.id);

    this.adminService.deleteGroup(group.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.processingId.set(null))
      )
      .subscribe({
        next: () => {
          this.toastService.success('Gruppo eliminato');
          this.groups.update(groups => groups.filter(g => g.id !== group.id));
          this.totalElements.update(n => n - 1);
        },
        error: () => {
          this.toastService.error('Errore durante l\'eliminazione');
        }
      });
  }

  /**
   * Visualizza post
   */
  viewPost(post: PostResponseDTO): void {
    this.router.navigate(['/post', post.id]);
  }

  /**
   * Tronca testo per anteprima
   */
  truncateText(text: string | null, maxLength: number = 150): string {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  /**
   * Navigazione pagine
   */
  goToPage(page: number): void {
    if (page < 0 || page >= this.totalPages()) return;
    this.currentPage.set(page);

    const query = this.searchQuery();
    if (query.trim()) {
      this.searchContent(query);
    } else {
      this.loadContent();
    }
  }

  previousPage(): void {
    this.goToPage(this.currentPage() - 1);
  }

  nextPage(): void {
    this.goToPage(this.currentPage() + 1);
  }

  /**
   * Torna indietro
   */
  goBack(): void {
    this.router.navigate(['/admin']);
  }
}
