import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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
  ChevronLeft,
  Send,
  ExternalLink,
  BookOpen,
  MessageCircle,
  Tag,
  Check,
  Image,
  Sparkles,
} from 'lucide-angular';

import { LibraryStore, LibraryTab } from '../../../core/stores/library-store';
import { SkeletonComponent } from '../../../shared/ui/skeleton/skeleton-component/skeleton-component';
import { ModalComponent } from '../../../shared/ui/modal/modal-component/modal-component';
import { ButtonComponent } from '../../../shared/ui/button/button-component/button-component';
import { AvatarComponent } from '../../../shared/ui/avatar/avatar-component/avatar-component';
import { SpinnerComponent } from '../../../shared/ui/spinner/spinner-component/spinner-component';
import {
  BookCondition,
  BookListingResponseDTO,
  BookListingStatus,
  BookSubject,
  CreaBookListingRequestDTO,
  LibraryConversationResponseDTO,
  LibraryMessageResponseDTO,
} from '../../../models';

@Component({
  selector: 'app-library-page',
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    SkeletonComponent,
    ModalComponent,
    ButtonComponent,
    AvatarComponent,
    SpinnerComponent,
  ],
  templateUrl: './library-page.html',
  styleUrl: './library-page.scss',
})
export class LibraryPage implements OnInit {
  private readonly router = inject(Router);
  readonly store = inject(LibraryStore);

  // Icons
  readonly ArrowLeftIcon = ArrowLeft;
  readonly PlusIcon = Plus;
  readonly SearchIcon = Search;
  readonly SlidersIcon = SlidersHorizontal;
  readonly XIcon = X;
  readonly PencilIcon = Pencil;
  readonly Trash2Icon = Trash2;
  readonly InfoIcon = Info;
  readonly ChevronLeftIcon = ChevronLeft;
  readonly SendIcon = Send;
  readonly ExternalLinkIcon = ExternalLink;
  readonly BookOpenIcon = BookOpen;
  readonly MessageCircleIcon = MessageCircle;
  readonly TagIcon = Tag;
  readonly CheckIcon = Check;
  readonly ImageIcon = Image;
  readonly SparklesIcon = Sparkles;

  // Local UI state
  readonly searchQuery = signal('');
  readonly showMobileFilters = signal(false);
  readonly chatInput = signal('');

  // Sell modal form state
  readonly sellForm = signal<Partial<CreaBookListingRequestDTO>>({});
  readonly sellFormSubmitting = signal(false);

  // Filter selections
  readonly filterAnno = signal<string>('');
  readonly filterMateria = signal<string>('');
  readonly filterCondizione = signal<string>('');
  readonly filterPrezzo = signal<string>('');
  readonly sortOrder = signal<string>('recenti');

  // Enums for template
  readonly BookCondition = BookCondition;
  readonly BookListingStatus = BookListingStatus;
  readonly BookSubject = BookSubject;

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
    { value: BookSubject.MATEMATICA, label: 'Matematica' },
    { value: BookSubject.ITALIANO, label: 'Italiano' },
    { value: BookSubject.INGLESE, label: 'Inglese' },
    { value: BookSubject.STORIA, label: 'Storia' },
    { value: BookSubject.FISICA, label: 'Fisica' },
    { value: BookSubject.INFORMATICA, label: 'Informatica' },
    { value: BookSubject.ALTRO, label: 'Altro' },
  ];

  readonly condizioneOptions = [
    { value: '', label: 'Tutte le condizioni' },
    { value: BookCondition.COME_NUOVO, label: 'Come nuovo' },
    { value: BookCondition.BUONE_CONDIZIONI, label: 'Buone condizioni' },
    { value: BookCondition.USATO, label: 'Usato' },
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
    { value: BookListingStatus.DISPONIBILE, label: 'Disponibile' },
    { value: BookListingStatus.RICHIESTO, label: 'Richiesto' },
    { value: BookListingStatus.VENDUTO, label: 'Venduto' },
  ];

  // Computed
  readonly showListingsEmpty = computed(
    () => !this.store.listingsLoading() && !this.store.hasListings()
  );
  readonly showMyListingsEmpty = computed(
    () => !this.store.myListingsLoading() && !this.store.hasMyListings()
  );
  readonly showConversationsEmpty = computed(
    () => !this.store.conversationsLoading() && !this.store.hasConversations()
  );

  ngOnInit(): void {
    this.store.loadListings();
    this.store.loadMyListings();
    this.store.loadConversations();
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
    this.store.updateFilters({ search: value || undefined });
  }

  onFilterAnnoChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.filterAnno.set(value);
    this.store.updateFilters({ anno: value ? parseInt(value) : undefined });
  }

  onFilterMateriaChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.filterMateria.set(value);
    this.store.updateFilters({ materia: (value as BookSubject) || undefined });
  }

  onFilterCondizioneChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.filterCondizione.set(value);
    this.store.updateFilters({ condizione: (value as BookCondition) || undefined });
  }

  onFilterPrezzoChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.filterPrezzo.set(value);
    let prezzoMin: number | undefined;
    let prezzoMax: number | undefined;
    if (value === '0-10') { prezzoMax = 10; }
    else if (value === '10-20') { prezzoMin = 10; prezzoMax = 20; }
    else if (value === '20-30') { prezzoMin = 20; prezzoMax = 30; }
    else if (value === '30+') { prezzoMin = 30; }
    this.store.updateFilters({ prezzoMin, prezzoMax });
  }

  onSortChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.sortOrder.set(value);
    this.store.updateFilters({ sort: value as 'recenti' | 'prezzo_asc' | 'prezzo_desc' });
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
    this.store.resetFilters();
  }

  // =========================================================================
  // I miei annunci
  // =========================================================================
  onStatusChange(event: Event, listing: BookListingResponseDTO): void {
    const value = (event.target as HTMLSelectElement).value as BookListingStatus;
    this.store.updateListingStatus(listing.id, value);
  }

  onDeleteListing(listing: BookListingResponseDTO): void {
    this.store.deleteListing(listing.id);
  }

  // =========================================================================
  // Sell modal
  // =========================================================================
  openSellModal(): void {
    this.sellForm.set({});
    this.store.openSellModal();
  }

  closeSellModal(): void {
    this.store.closeSellModal();
  }

  updateSellForm(field: keyof CreaBookListingRequestDTO, value: any): void {
    this.sellForm.update((prev) => ({ ...prev, [field]: value }));
  }

  async submitSellForm(): Promise<void> {
    const form = this.sellForm();
    if (!form.titolo || !form.autore || !form.anno || !form.materia || !form.condizione || form.prezzo == null) {
      return;
    }
    this.sellFormSubmitting.set(true);
    try {
      await this.store.createListing({
        titolo: form.titolo,
        autore: form.autore,
        isbn: form.isbn,
        anno: form.anno,
        materia: form.materia,
        condizione: form.condizione,
        prezzo: form.prezzo,
        descrizione: form.descrizione,
        imageUrl: form.imageUrl || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400',
        imageUrlRetro: form.imageUrlRetro,
      });
    } finally {
      this.sellFormSubmitting.set(false);
    }
  }

  // =========================================================================
  // Chat / Messaggi
  // =========================================================================
  openConversation(conversation: LibraryConversationResponseDTO): void {
    this.store.openConversation(conversation);
  }

  closeChat(): void {
    this.store.closeConversation();
  }

  sendMessage(): void {
    const msg = this.chatInput().trim();
    if (!msg) return;
    this.store.sendMessage(msg);
    this.chatInput.set('');
  }

  onChatKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  // =========================================================================
  // Helpers
  // =========================================================================
  getConditionLabel(condizione: BookCondition): string {
    const map: Record<BookCondition, string> = {
      [BookCondition.COME_NUOVO]: 'Come nuovo',
      [BookCondition.BUONE_CONDIZIONI]: 'Buone condizioni',
      [BookCondition.USATO]: 'Usato',
    };
    return map[condizione] || condizione;
  }

  getConditionColor(condizione: BookCondition): string {
    const map: Record<BookCondition, string> = {
      [BookCondition.COME_NUOVO]: 'bg-success-500',
      [BookCondition.BUONE_CONDIZIONI]: 'bg-warning-500',
      [BookCondition.USATO]: 'bg-orange-500',
    };
    return map[condizione] || 'bg-gray-500';
  }

  getAnnoLabel(anno: number): string {
    if (anno === 0) return 'Tutti gli anni';
    return `${anno}° Anno`;
  }

  getSubjectLabel(materia: BookSubject): string {
    const map: Record<BookSubject, string> = {
      [BookSubject.MATEMATICA]: 'Matematica',
      [BookSubject.ITALIANO]: 'Italiano',
      [BookSubject.INGLESE]: 'Inglese',
      [BookSubject.STORIA]: 'Storia',
      [BookSubject.FISICA]: 'Fisica',
      [BookSubject.INFORMATICA]: 'Informatica',
      [BookSubject.ALTRO]: 'Altro',
    };
    return map[materia] || materia;
  }

  getStatusColor(stato: BookListingStatus): string {
    const map: Record<BookListingStatus, string> = {
      [BookListingStatus.DISPONIBILE]: 'bg-success-500',
      [BookListingStatus.RICHIESTO]: 'bg-warning-500',
      [BookListingStatus.VENDUTO]: 'bg-gray-400',
    };
    return map[stato] || 'bg-gray-500';
  }

  getStatusSelectClasses(stato: BookListingStatus): string {
    const map: Record<BookListingStatus, string> = {
      [BookListingStatus.DISPONIBILE]: 'bg-success-50 border-success-200 text-success-700',
      [BookListingStatus.RICHIESTO]: 'bg-warning-50 border-warning-200 text-warning-700',
      [BookListingStatus.VENDUTO]: 'bg-gray-100 border-gray-200 text-gray-500',
    };
    return map[stato] || '';
  }

  getInitial(name: string): string {
    return name.charAt(0).toUpperCase();
  }

  isMyMessage(message: LibraryMessageResponseDTO): boolean {
    // In un sistema reale, confronterebbe con l'utente corrente
    return message.id % 2 === 0;
  }

  formatTime(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  }

  formatRelativeTime(dateStr: string): string {
    const date = new Date(dateStr);
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
