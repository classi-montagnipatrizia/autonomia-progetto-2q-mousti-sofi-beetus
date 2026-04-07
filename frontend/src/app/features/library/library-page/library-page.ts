import { Component, computed, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import {
  LucideAngularModule,
  ArrowLeft,
  Plus,
  Search,
  SlidersHorizontal,
  X,
  Pencil,
  Trash2,
  Info,
  BookOpen,
  MessageCircle,
  Users,
  Lightbulb,
} from 'lucide-angular';

import { LibraryStore, LibraryTab } from '../../../core/stores/library-store';
import { AuthStore } from '../../../core/stores/auth-store';
import { ToastService } from '../../../core/services/toast-service';
import { WebsocketService } from '../../../core/services/websocket-service';
import { DialogService } from '../../../core/services/dialog-service';
import { SkeletonComponent } from '../../../shared/ui/skeleton/skeleton-component/skeleton-component';
import { ButtonComponent } from '../../../shared/ui/button/button-component/button-component';
import { AvatarComponent } from '../../../shared/ui/avatar/avatar-component/avatar-component';
import { SellBookModal } from '../sell-book-modal/sell-book-modal';
import { BookCardComponent } from '../../../shared/components/book-card/book-card-component/book-card-component';
import { AiChatbot } from '../ai-chatbot/ai-chatbot';
import {
  BookResponseDTO,
  BookSummaryDTO,
  BookCondition,
  BookStatus,
  BookConversationDTO,
} from '../../../models';

@Component({
  selector: 'app-library-page',
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    SkeletonComponent,
    ButtonComponent,
    AvatarComponent,
    SellBookModal,
    BookCardComponent,
    AiChatbot,
  ],
  templateUrl: './library-page.html',
  styleUrl: './library-page.scss',
})
export class LibraryPage implements OnInit, OnDestroy {
  readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly authStore = inject(AuthStore);
  readonly store = inject(LibraryStore);
  private readonly toast = inject(ToastService);
  private readonly websocketService = inject(WebsocketService);
  private readonly dialogService = inject(DialogService);

  private wsBookMessagesSub?: Subscription;

  // Icons
  readonly ArrowLeftIcon = ArrowLeft;
  readonly PlusIcon = Plus;
  readonly SearchIcon = Search;
  readonly SlidersIcon = SlidersHorizontal;
  readonly XIcon = X;
  readonly PencilIcon = Pencil;
  readonly Trash2Icon = Trash2;
  readonly InfoIcon = Info;
  readonly BookOpenIcon = BookOpen;
  readonly MessageCircleIcon = MessageCircle;
  readonly UsersIcon = Users;
  readonly LightbulbIcon = Lightbulb;

  // Local UI state
  readonly searchQuery = signal('');
  readonly showMobileFilters = signal(false);
  readonly showChatbot = signal(false);
  readonly editingListing = signal<BookResponseDTO | null>(null);

  // Filter selections
  readonly filterAnno = signal<string>('');
  readonly filterMateria = signal<string>('');
  readonly filterCondizione = signal<string>('');
  readonly filterPrezzo = signal<string>('');
  readonly sortOrder = signal<string>('recenti');

  // Enums for template
  readonly BookCondition = BookCondition;
  readonly BookStatus = BookStatus;

  // Filter options
  readonly anniOptions = [
    { value: '', label: 'Tutti gli anni' },
    { value: '1', label: '1° Anno' },
    { value: '2', label: '2° Anno' },
    { value: '3', label: '3° Anno' },
    { value: '4', label: '4° Anno' },
    { value: '5', label: '5° Anno' },
  ];

  readonly materieOptions = [
    { value: '', label: 'Tutte le materie' },
    { value: 'Matematica', label: 'Matematica' },
    { value: 'Italiano', label: 'Italiano' },
    { value: 'Inglese', label: 'Inglese' },
    { value: 'Storia', label: 'Storia' },
    { value: 'Fisica', label: 'Fisica' },
    { value: 'Informatica', label: 'Informatica' },
    { value: 'Altro', label: 'Altro' },
  ];

  readonly condizioneOptions = [
    { value: '', label: 'Tutte le condizioni' },
    { value: BookCondition.OTTIMO, label: 'Ottimo' },
    { value: BookCondition.BUONO, label: 'Buono' },
    { value: BookCondition.ACCETTABILE, label: 'Accettabile' },
  ];

  readonly prezzoOptions = [
    { value: '', label: 'Qualsiasi prezzo' },
    { value: '0-10', label: 'Fino a 10€' },
    { value: '10-20', label: '10€ - 20€' },
    { value: '20-30', label: '20€ - 30€' },
    { value: '30+', label: 'Oltre 30€' },
  ];

  readonly sortOptions = [
    { value: 'recenti', label: 'Più recenti' },
    { value: 'prezzo_asc', label: 'Prezzo crescente' },
    { value: 'prezzo_desc', label: 'Prezzo decrescente' },
  ];

  readonly statusOptions = [
    { value: BookStatus.DISPONIBILE, label: 'Disponibile' },
    { value: BookStatus.VENDUTO, label: 'Venduto' },
  ];

  // Computed
  readonly sortedAvailableBooks = computed(() => {
    const books = [...this.store.availableBooks()];
    const order = this.sortOrder();

    if (order === 'prezzo_asc') {
      return books.sort((a, b) => a.prezzo - b.prezzo);
    }

    if (order === 'prezzo_desc') {
      return books.sort((a, b) => b.prezzo - a.prezzo);
    }

    return books.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  });

  readonly showListingsEmpty = computed(
    () => !this.store.isLoading() && this.store.availableBooks().length === 0
  );
  readonly showMyListingsEmpty = computed(
    () => !this.store.isLoading() && this.store.myListings().length === 0
  );
  readonly showConversationsEmpty = computed(
    () => !this.store.isLoading() && this.store.conversations().length === 0
  );

  ngOnInit(): void {
    this.store.loadAvailableBooks();
    this.store.loadMyListings();
    this.store.loadConversazioni();

    // Legge il tab dal query param (es. dalla notifica push BOOK_REQUEST → ?tab=miei)
    const tab = this.route.snapshot.queryParamMap.get('tab') as LibraryTab | null;
    if (tab && ['compra', 'miei', 'messaggi'].includes(tab)) {
      this.store.setActiveTab(tab);
    }

    // Sottoscrizione WebSocket per aggiornare la lista conversazioni in real-time
    this.wsBookMessagesSub = this.websocketService.bookMessages$.subscribe({
      next: (message) => {
        this.store.handleIncomingBookMessage(message);
      },
    });
  }

  ngOnDestroy(): void {
    this.wsBookMessagesSub?.unsubscribe();
  }

  // =========================================================================
  // Tab
  // =========================================================================
  switchTab(tab: LibraryTab): void {
    this.store.setActiveTab(tab);
  }
  

  // =========================================================================
  // Navigazione
  // =========================================================================
  goBack(): void {
    this.router.navigate(['/']);
  }

  // =========================================================================
  // Filtri
  // =========================================================================
  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
    const current = this.store.filters();
    this.store.setFilters({ ...current, q: value || undefined });
  }

  onFilterAnnoChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.filterAnno.set(value);
    const current = this.store.filters();
    this.store.setFilters({ ...current, anno: value || undefined });
  }

  onFilterMateriaChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.filterMateria.set(value);
    const current = this.store.filters();
    this.store.setFilters({ ...current, materia: value || undefined });
  }

  onFilterCondizioneChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.filterCondizione.set(value);
    const current = this.store.filters();
    this.store.setFilters({ ...current, condizione: value || undefined });
  }

  onFilterPrezzoChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.filterPrezzo.set(value);
    let prezzoMax: number | undefined;
    if (value === '0-10') { prezzoMax = 10; }
    else if (value === '10-20') { prezzoMax = 20; }
    else if (value === '20-30') { prezzoMax = 30; }
    const current = this.store.filters();
    this.store.setFilters({ ...current, prezzoMax });
  }

  onSortChange(event: Event): void {
    this.sortOrder.set((event.target as HTMLSelectElement).value);
    // Sort handled client-side or via reload — store doesn't have sort param yet
  }

  toggleMobileFilters(): void {
    this.showMobileFilters.update((v) => !v);
  }

  applyMobileFilters(): void {
    this.showMobileFilters.set(false);
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.filterAnno.set('');
    this.filterMateria.set('');
    this.filterCondizione.set('');
    this.filterPrezzo.set('');
    this.sortOrder.set('recenti');
    this.store.clearFilters();
  }

  // =========================================================================
  // I miei annunci
  // =========================================================================
  onStatusChange(event: Event, listing: BookResponseDTO): void {
    const value = (event.target as HTMLSelectElement).value;
    this.store.aggiornaStato(listing.id, value);
  }

  async onDeleteListing(listing: BookResponseDTO): Promise<void> {
    const confirmed = await this.dialogService.confirmDangerous({
      title: 'Elimina annuncio',
      message: `Sei sicuro di voler eliminare l'annuncio "${listing.titolo}"? Questa azione non può essere annullata.`,
      confirmText: 'Elimina',
      cancelText: 'Annulla',
    });
    if (!confirmed) return;
    this.store.eliminaLibro(listing.id);
  }

  // =========================================================================
  // Sell modal
  // =========================================================================
  openSellModal(): void {
    this.editingListing.set(null);
    this.store.openSellModal();
  }

  openEditModal(listing: BookResponseDTO): void {
    this.editingListing.set(listing);
    this.store.openSellModal();
  }

  closeSellModal(): void {
    this.editingListing.set(null);
    this.store.closeSellModal();
  }

  async onSellBookSubmitted(_book: BookResponseDTO): Promise<void> {
    await this.store.loadMyListings();
    await this.store.loadAvailableBooks();
    this.editingListing.set(null);
    this.store.closeSellModal();
  }

  // =========================================================================
  // Richiesta libro dalla card
  // =========================================================================
  async onBookRequested(book: BookSummaryDTO): Promise<void> {
    try {
      await this.store.requestBook(book.id);
      this.toast.success('Richiesta inviata al venditore!');
    } catch {
      this.toast.error('Errore durante la richiesta. Riprova.');
    }
  }

  // =========================================================================
  // Chat / Messaggi
  // =========================================================================
  openConversation(conv: BookConversationDTO): void {
    this.router.navigate(['/library', 'conversation', conv.libro.id], {
      queryParams: { convId: conv.id },
    });
  }

  async deleteConversation(event: Event, convId: number): Promise<void> {
    event.stopPropagation();
    const confirmed = await this.dialogService.confirmDangerous({
      title: 'Elimina conversazione',
      message: 'Sei sicuro di voler eliminare questa conversazione? Questa azione non può essere annullata.',
      confirmText: 'Elimina',
      cancelText: 'Annulla',
    });
    if (!confirmed) return;
    try {
      await this.store.eliminaConversazione(convId);
      this.toast.success('Conversazione eliminata');
    } catch {
      this.toast.error('Errore durante l\'eliminazione della conversazione');
    }
  }

  // =========================================================================
  // Helpers
  // =========================================================================
  getConditionLabel(condizione: BookCondition): string {
    const map: Record<BookCondition, string> = {
      [BookCondition.OTTIMO]: 'Ottimo',
      [BookCondition.BUONO]: 'Buono',
      [BookCondition.ACCETTABILE]: 'Accettabile',
    };
    return map[condizione] ?? condizione;
  }

  getConditionColor(condizione: BookCondition): string {
    const map: Record<BookCondition, string> = {
      [BookCondition.OTTIMO]: 'bg-emerald-500',
      [BookCondition.BUONO]: 'bg-blue-500',
      [BookCondition.ACCETTABILE]: 'bg-amber-500',
    };
    return map[condizione] ?? 'bg-gray-500';
  }

  getStatusColor(stato: BookStatus): string {
    const map: Record<BookStatus, string> = {
      [BookStatus.DISPONIBILE]: 'bg-success-500',
      [BookStatus.VENDUTO]: 'bg-gray-400',
    };
    return map[stato] ?? 'bg-gray-500';
  }

  getStatusSelectClasses(stato: BookStatus): string {
    const map: Record<BookStatus, string> = {
      [BookStatus.DISPONIBILE]: 'bg-success-50 border-success-200 text-success-700',
      [BookStatus.VENDUTO]: 'bg-gray-100 border-gray-200 text-gray-500',
    };
    return map[stato] ?? '';
  }

  isMyMessage(mittentId: number): boolean {
    return this.authStore.userId() === mittentId;
  }

  formatTime(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  }

  formatRelativeTime(dateStr: string): string {
    if (!dateStr) return '';

    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return '';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return this.formatTime(dateStr);
    if (diffDays === 1) return 'ieri';
    if (diffDays < 7) {
      const days = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];
      return days[date.getDay()];
    }

    return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }
}
