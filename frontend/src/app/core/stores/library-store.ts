import { computed, inject, Injectable, signal } from '@angular/core';
import { LibraryService } from '../api/library-service';
import { LoggerService } from '../services/logger.service';
import {
  BookListingResponseDTO,
  BookListingFilters,
  BookListingStatus,
  CreaBookListingRequestDTO,
  LibraryConversationResponseDTO,
  LibraryMessageResponseDTO,
  PageResponse,
} from '../../models';
import { firstValueFrom } from 'rxjs';

export type LibraryTab = 'compra' | 'miei' | 'messaggi';

@Injectable({ providedIn: 'root' })
export class LibraryStore {
  private readonly libraryService = inject(LibraryService);
  private readonly logger = inject(LoggerService);

  // =========================================================================
  // STATE - Tab Compra
  // =========================================================================
  private readonly _listings = signal<BookListingResponseDTO[]>([]);
  private readonly _listingsLoading = signal<boolean>(false);
  private readonly _listingsTotalElements = signal<number>(0);
  private readonly _listingsHasMore = signal<boolean>(false);
  private readonly _listingsCurrentPage = signal<number>(0);
  private readonly _filters = signal<BookListingFilters>({});

  // =========================================================================
  // STATE - Tab I miei annunci
  // =========================================================================
  private readonly _myListings = signal<BookListingResponseDTO[]>([]);
  private readonly _myListingsLoading = signal<boolean>(false);

  // =========================================================================
  // STATE - Tab Messaggi
  // =========================================================================
  private readonly _conversations = signal<LibraryConversationResponseDTO[]>([]);
  private readonly _conversationsLoading = signal<boolean>(false);
  private readonly _chatMessages = signal<LibraryMessageResponseDTO[]>([]);
  private readonly _chatLoading = signal<boolean>(false);
  private readonly _activeConversation = signal<LibraryConversationResponseDTO | null>(null);

  // =========================================================================
  // STATE - Generale
  // =========================================================================
  private readonly _activeTab = signal<LibraryTab>('compra');
  private readonly _sellModalOpen = signal<boolean>(false);

  // =========================================================================
  // PUBLIC SELECTORS
  // =========================================================================
  readonly listings = this._listings.asReadonly();
  readonly listingsLoading = this._listingsLoading.asReadonly();
  readonly listingsTotalElements = this._listingsTotalElements.asReadonly();
  readonly listingsHasMore = this._listingsHasMore.asReadonly();
  readonly filters = this._filters.asReadonly();

  readonly myListings = this._myListings.asReadonly();
  readonly myListingsLoading = this._myListingsLoading.asReadonly();

  readonly conversations = this._conversations.asReadonly();
  readonly conversationsLoading = this._conversationsLoading.asReadonly();
  readonly chatMessages = this._chatMessages.asReadonly();
  readonly chatLoading = this._chatLoading.asReadonly();
  readonly activeConversation = this._activeConversation.asReadonly();

  readonly activeTab = this._activeTab.asReadonly();
  readonly sellModalOpen = this._sellModalOpen.asReadonly();

  // Computed
  readonly hasListings = computed(() => this._listings().length > 0);
  readonly hasMyListings = computed(() => this._myListings().length > 0);
  readonly hasConversations = computed(() => this._conversations().length > 0);
  readonly unreadMessagesCount = computed(() =>
    this._conversations().reduce((sum, c) => sum + c.messaggiNonLetti, 0)
  );
  readonly isChatOpen = computed(() => this._activeConversation() !== null);

  // =========================================================================
  // ACTIONS - Tab
  // =========================================================================
  setActiveTab(tab: LibraryTab): void {
    this._activeTab.set(tab);
  }

  // =========================================================================
  // ACTIONS - Compra
  // =========================================================================
  async loadListings(reset: boolean = true): Promise<void> {
    if (this._listingsLoading()) return;
    this._listingsLoading.set(true);

    try {
      const page = reset ? 0 : this._listingsCurrentPage() + 1;
      const result = await firstValueFrom(
        this.libraryService.getListings(this._filters(), page)
      );

      if (reset) {
        this._listings.set(result.content);
      } else {
        this._listings.update((prev) => [...prev, ...result.content]);
      }

      this._listingsCurrentPage.set(result.number);
      this._listingsTotalElements.set(result.totalElements);
      this._listingsHasMore.set(!result.last);
    } catch (error) {
      this.logger.error('Errore caricamento annunci', error);
    } finally {
      this._listingsLoading.set(false);
    }
  }

  async updateFilters(filters: Partial<BookListingFilters>): Promise<void> {
    this._filters.update((prev) => ({ ...prev, ...filters }));
    await this.loadListings(true);
  }

  async resetFilters(): Promise<void> {
    this._filters.set({});
    await this.loadListings(true);
  }

  // =========================================================================
  // ACTIONS - I miei annunci
  // =========================================================================
  async loadMyListings(): Promise<void> {
    if (this._myListingsLoading()) return;
    this._myListingsLoading.set(true);

    try {
      const result = await firstValueFrom(this.libraryService.getMyListings());
      this._myListings.set(result.content);
    } catch (error) {
      this.logger.error('Errore caricamento miei annunci', error);
    } finally {
      this._myListingsLoading.set(false);
    }
  }

  async updateListingStatus(listingId: number, status: BookListingStatus): Promise<void> {
    try {
      await firstValueFrom(this.libraryService.updateListingStatus(listingId, status));
      this._myListings.update((listings) =>
        listings.map((l) => (l.id === listingId ? { ...l, stato: status, updatedAt: new Date().toISOString() } : l))
      );
    } catch (error) {
      this.logger.error('Errore aggiornamento stato annuncio', error);
    }
  }

  async deleteListing(listingId: number): Promise<void> {
    try {
      await firstValueFrom(this.libraryService.deleteListing(listingId));
      this._myListings.update((listings) => listings.filter((l) => l.id !== listingId));
    } catch (error) {
      this.logger.error('Errore eliminazione annuncio', error);
    }
  }

  // =========================================================================
  // ACTIONS - Sell Modal
  // =========================================================================
  openSellModal(): void {
    this._sellModalOpen.set(true);
  }

  closeSellModal(): void {
    this._sellModalOpen.set(false);
  }

  async createListing(request: CreaBookListingRequestDTO): Promise<void> {
    try {
      const newListing = await firstValueFrom(this.libraryService.createListing(request));
      this._myListings.update((prev) => [newListing, ...prev]);
      this._sellModalOpen.set(false);
    } catch (error) {
      this.logger.error('Errore creazione annuncio', error);
    }
  }

  // =========================================================================
  // ACTIONS - Conversazioni / Chat
  // =========================================================================
  async loadConversations(): Promise<void> {
    if (this._conversationsLoading()) return;
    this._conversationsLoading.set(true);

    try {
      const conversations = await firstValueFrom(this.libraryService.getConversations());
      this._conversations.set(conversations);
    } catch (error) {
      this.logger.error('Errore caricamento conversazioni', error);
    } finally {
      this._conversationsLoading.set(false);
    }
  }

  async openConversation(conversation: LibraryConversationResponseDTO): Promise<void> {
    this._activeConversation.set(conversation);
    this._chatLoading.set(true);

    try {
      const messages = await firstValueFrom(
        this.libraryService.getConversationMessages(conversation.id)
      );
      this._chatMessages.set(messages);
    } catch (error) {
      this.logger.error('Errore caricamento messaggi', error);
    } finally {
      this._chatLoading.set(false);
    }
  }

  closeConversation(): void {
    this._activeConversation.set(null);
    this._chatMessages.set([]);
  }

  async sendMessage(contenuto: string): Promise<void> {
    const conversation = this._activeConversation();
    if (!conversation) return;

    try {
      const message = await firstValueFrom(
        this.libraryService.sendMessage(conversation.id, contenuto)
      );
      this._chatMessages.update((prev) => [...prev, message]);
    } catch (error) {
      this.logger.error('Errore invio messaggio', error);
    }
  }

  // =========================================================================
  // ACTIONS - Pulizia
  // =========================================================================
  clear(): void {
    this._listings.set([]);
    this._myListings.set([]);
    this._conversations.set([]);
    this._chatMessages.set([]);
    this._activeConversation.set(null);
    this._activeTab.set('compra');
    this._filters.set({});
    this._sellModalOpen.set(false);
  }
}
