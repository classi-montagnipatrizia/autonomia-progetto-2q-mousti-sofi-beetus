import { Component, DestroyRef, input, output, signal, inject, computed, ElementRef, HostListener } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Subject, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';
import { SearchService } from '../../../../core/services/search-service';
import { AvatarComponent } from '../../../ui/avatar/avatar-component/avatar-component';
import { UserSummaryDTO } from '../../../../models';

/**
 * Componente per l'autocomplete delle menzioni @username
 * 
 * Mostra un dropdown con suggerimenti di utenti quando viene digitato @
 * nella textarea di post o commenti.
 * 
 * @example
 * <app-mention-autocomplete
 *   [textareaRef]="textareaElement"
 *   [searchTerm]="mentionSearchTerm()"
 *   [show]="showMentionDropdown()"
 *   [position]="dropdownPosition()"
 *   (userSelected)="onMentionSelected($event)"
 *   (close)="closeMentionDropdown()"
 * />
 */
@Component({
  selector: 'app-mention-autocomplete-component',
  imports: [AvatarComponent],
  templateUrl: './mention-autocomplete-component.html',
  styleUrl: './mention-autocomplete-component.scss',
})
export class MentionAutocompleteComponent {
  private readonly searchService = inject(SearchService);
  private readonly elementRef = inject(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly searchSubject = new Subject<string>();

  // ========== INPUTS ==========

  /**
   * Termine di ricerca (dopo @)
   */
  readonly searchTerm = input<string>('');

  /**
   * Se mostrare il dropdown
   */
  readonly show = input<boolean>(false);

  /**
   * Posizione del dropdown (top, left in px)
   */
  readonly position = input<{ top: number; left: number }>({ top: 0, left: 0 });

  // ========== OUTPUTS ==========

  /**
   * Emesso quando un utente viene selezionato
   */
  readonly userSelected = output<UserSummaryDTO>();

  /**
   * Emesso quando il dropdown deve chiudersi
   */
  readonly close = output<void>();

  // ========== STATE ==========

  readonly suggestions = signal<UserSummaryDTO[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly selectedIndex = signal<number>(0);

  // ========== COMPUTED ==========

  readonly hasSuggestions = computed(() => this.suggestions().length > 0);

  constructor() {
    // Setup ricerca con debounce
    this.searchSubject.pipe(
      debounceTime(200),
      distinctUntilChanged(),
      switchMap(term => {
        if (!term || term.length === 0) {
          return of([]);
        }
        this.isLoading.set(true);
        return this.searchService.getMentionSuggestions(term);
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (users) => {
        this.suggestions.set(users);
        this.selectedIndex.set(0);
        this.isLoading.set(false);
      },
      error: () => {
        this.suggestions.set([]);
        this.isLoading.set(false);
      }
    });
  }

  /**
   * Aggiorna la ricerca quando cambia il termine
   */
  search(term: string): void {
    this.searchSubject.next(term);
  }

  /**
   * Seleziona un utente dalla lista
   */
  selectUser(user: UserSummaryDTO): void {
    this.userSelected.emit(user);
  }

  /**
   * Gestisce la navigazione da tastiera
   */
  handleKeydown(event: KeyboardEvent): boolean {
    if (!this.show()) return false;

    const suggestions = this.suggestions();
    if (suggestions.length === 0) return false;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.selectedIndex.update(i => (i + 1) % suggestions.length);
        return true;

      case 'ArrowUp':
        event.preventDefault();
        this.selectedIndex.update(i => (i - 1 + suggestions.length) % suggestions.length);
        return true;

      case 'Enter':
      case 'Tab':
        event.preventDefault();
        const selected = suggestions[this.selectedIndex()];
        if (selected) {
          this.selectUser(selected);
        }
        return true;

      case 'Escape':
        event.preventDefault();
        this.close.emit();
        return true;

      default:
        return false;
    }
  }

  /**
   * Chiude il dropdown se si clicca fuori
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.show() && !this.elementRef.nativeElement.contains(event.target)) {
      this.close.emit();
    }
  }
}
