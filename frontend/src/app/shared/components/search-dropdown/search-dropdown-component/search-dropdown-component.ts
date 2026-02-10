import {
  Component,
  input,
  output,
  signal,
  inject,
  computed,
  effect,
  ElementRef,
  viewChild,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { LucideAngularModule, Search, X, User, FileText } from 'lucide-angular';
import { SearchService, GlobalSearchResults } from '../../../../core/services/search-service';
import { UserSummaryDTO, PostResponseDTO } from '../../../../models';
import { AvatarComponent } from '../../../ui/avatar/avatar-component/avatar-component';
import { ButtonComponent } from '../../../ui/button/button-component/button-component';
import { SpinnerComponent } from '../../../ui/spinner/spinner-component/spinner-component';
import { ClickOutside } from '../../../directives/click-outside';

@Component({
  selector: 'app-search-dropdown-component',
  imports: [CommonModule,
    FormsModule,
    LucideAngularModule,
    AvatarComponent,
    ButtonComponent,
    SpinnerComponent,
    ClickOutside,
    ],
  templateUrl: './search-dropdown-component.html',
  styleUrl: './search-dropdown-component.scss',
})
export class SearchDropdownComponent implements OnDestroy{
private readonly searchService = inject(SearchService);
  private readonly router = inject(Router);
  private readonly destroy$ = new Subject<void>();

  // Riferimento all'input di ricerca
  readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInputRef');

  // Icone Lucide
  readonly SearchIcon = Search;
  readonly XIcon = X;
  readonly UserIcon = User;
  readonly FileTextIcon = FileText;

  /**
   * Placeholder dell'input
   * @default 'Cerca utenti o post...'
   */
  readonly placeholder = input<string>('Cerca utenti o post...');

  /**
   * Numero massimo di risultati per categoria
   * @default 5
   */
  readonly maxResults = input<number>(5);

  /**
   * Mostra link "Vedi tutti i risultati"
   * @default true
   */
  readonly showViewAll = input<boolean>(true);

  /**
   * Emesso quando viene selezionato un utente
   */
  readonly userSelected = output<UserSummaryDTO>();

  /**
   * Emesso quando viene selezionato un post
   */
  readonly postSelected = output<PostResponseDTO>();

  /**
   * Emesso quando si clicca su "Vedi tutti"
   */
  readonly viewAllClicked = output<string>();

  // Stato interno
  readonly searchTerm = signal<string>('');
  readonly isOpen = signal<boolean>(false);
  readonly isLoading = signal<boolean>(false);
  readonly results = signal<GlobalSearchResults | null>(null);
  private readonly searchTermSubject = new Subject<string>();

  constructor() {
    // Setup ricerca con debounce
    this.setupSearch();

    // Effetto per sincronizzare il termine con il Subject
    effect(() => {
      const term = this.searchTerm();
      this.searchTermSubject.next(term);
    });
  }

  /**
   * Configura la ricerca con debounce
   */
  private setupSearch(): void {
    this.searchService
      .searchWithDebounce(this.searchTermSubject.asObservable())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (results) => {
          this.results.set(results);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
        },
      });
  }

  /**
   * Verifica se ci sono risultati
   */
  readonly hasResults = computed(() => {
    const res = this.results();
    if (!res) return false;
    return this.searchService.hasResults(res);
  });

  /**
   * Risultati utenti limitati
   */
  readonly displayedUsers = computed(() => {
    return this.results()?.users.slice(0, this.maxResults()) ?? [];
  });

  /**
   * Risultati post limitati
   */
  readonly displayedPosts = computed(() => {
    return this.results()?.posts.content.slice(0, this.maxResults()) ?? [];
  });

  /**
   * Verifica se mostrare sezione utenti
   */
  readonly hasUsers = computed(() => this.displayedUsers().length > 0);

  /**
   * Verifica se mostrare sezione post
   */
  readonly hasPosts = computed(() => this.displayedPosts().length > 0);

  /**
   * Verifica se mostrare "Vedi tutti" per utenti
   */
  readonly showViewAllUsers = computed(() => {
    const totalUsers = this.results()?.users.length ?? 0;
    return this.showViewAll() && totalUsers > this.maxResults();
  });

  /**
   * Verifica se mostrare "Vedi tutti" per post
   */
  readonly showViewAllPosts = computed(() => {
    const totalPosts = this.results()?.posts.totalElements ?? 0;
    return this.showViewAll() && totalPosts > this.maxResults();
  });

  /**
   * Gestisce l'input di ricerca
   */
  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
    this.isLoading.set(value.length > 0);
    this.isOpen.set(value.length > 0);
  }

  /**
   * Gestisce il focus sull'input
   */
  onFocus(): void {
    if (this.searchTerm().length > 0) {
      this.isOpen.set(true);
    }
  }

  /**
   * Pulisce la ricerca
   */
  clearSearch(): void {
    this.searchTerm.set('');
    this.isOpen.set(false);
    this.results.set(null);
    this.searchInput()?.nativeElement.focus();
  }

  /**
   * Chiude il dropdown
   */
  closeDropdown(): void {
    this.isOpen.set(false);
  }

  /**
   * Seleziona un utente
   */
  selectUser(user: UserSummaryDTO): void {
    this.userSelected.emit(user);
    this.closeDropdown();
    this.router.navigate(['/profile', user.id]);
  }

  /**
   * Seleziona un post
   */
  selectPost(post: PostResponseDTO): void {
    this.postSelected.emit(post);
    this.closeDropdown();
    this.router.navigate(['/post', post.id]);
  }

  /**
   * Naviga a tutti i risultati
   */
  viewAll(type: 'users' | 'posts'): void {
    this.viewAllClicked.emit(type);
    this.closeDropdown();
    this.router.navigate(['/search'], {
      queryParams: { q: this.searchTerm(), type },
    });
  }

  /**
   * Gestisce il submit del form (Enter)
   */
  onSubmit(event: Event): void {
    event.preventDefault();
    if (this.searchTerm().length > 0) {
      this.closeDropdown();
      this.router.navigate(['/search'], {
        queryParams: { q: this.searchTerm() },
      });
    }
  }

  /**
   * Tronca il contenuto del post per l'anteprima
   */
  truncateContent(content: string | null, maxLength: number = 80): string {
    if (!content) return '';
    if (content.length <= maxLength) return content;
    return content.slice(0, maxLength) + '...';
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
