import { computed, inject, Injectable, signal } from '@angular/core';
import { BookStore } from './book-store';
import { BookMessageDTO } from '../../models';

export type LibraryTab = 'compra' | 'miei' | 'messaggi';

/**
 * LibraryStore gestisce solo lo stato UI della pagina libreria.
 * Tutti i dati (libri, conversazioni, messaggi) sono in BookStore.
 */
@Injectable({ providedIn: 'root' })
export class LibraryStore {
  readonly bookStore = inject(BookStore);

  // ============================================================================
  // SIGNALS PRIVATI — solo UI state
  // ============================================================================

  private readonly _activeTab = signal<LibraryTab>('compra');
  private readonly _sellModalOpen = signal(false);

  // ============================================================================
  // SIGNALS PUBBLICI READONLY
  // ============================================================================

  readonly activeTab = this._activeTab.asReadonly();
  readonly sellModalOpen = this._sellModalOpen.asReadonly();

  // ============================================================================
  // DELEGHE A BookStore (shorthand per i template)
  // ============================================================================

  readonly availableBooks = this.bookStore.availableBooks;
  readonly myListings = this.bookStore.myListings;
  readonly conversations = this.bookStore.conversations;
  readonly currentConversation = this.bookStore.currentConversation;
  readonly currentConversationMessages = this.bookStore.currentConversationMessages;
  readonly isLoading = this.bookStore.isLoading;
  readonly filters = this.bookStore.filters;
  readonly hasActiveFilters = this.bookStore.hasActiveFilters;
  readonly hasMoreAvailable = this.bookStore.hasMoreAvailable;
  readonly hasMoreListings = this.bookStore.hasMoreListings;
  readonly bookDetail = this.bookStore.bookDetail;
  readonly bookDetailLoading = this.bookStore.bookDetailLoading;

  // ============================================================================
  // COMPUTED
  // ============================================================================

  readonly unreadMessagesCount = this.bookStore.unreadConversationsCount;
  readonly isChatOpen = computed(() => this.bookStore.currentConversation() !== null);

  // ============================================================================
  // AZIONI — Tab
  // ============================================================================

  setActiveTab(tab: LibraryTab): void {
    this._activeTab.set(tab);
  }

  // ============================================================================
  // AZIONI — Sell Modal
  // ============================================================================

  openSellModal(): void {
    this._sellModalOpen.set(true);
  }

  closeSellModal(): void {
    this._sellModalOpen.set(false);
  }

  // ============================================================================
  // AZIONI — delegate a BookStore
  // ============================================================================

  loadAvailableBooks(page = 0) {
    return this.bookStore.loadAvailableBooks(page);
  }

  loadMoreAvailable() {
    return this.bookStore.loadMoreAvailable();
  }

  setFilters(filters: Parameters<BookStore['setFilters']>[0]) {
    return this.bookStore.setFilters(filters);
  }

  clearFilters() {
    return this.bookStore.clearFilters();
  }

  loadMyListings(page = 0) {
    return this.bookStore.loadMyListings(page);
  }

  aggiornaStato(bookId: number, stato: string) {
    return this.bookStore.aggiornaStato(bookId, stato);
  }

  eliminaLibro(bookId: number) {
    return this.bookStore.eliminaLibro(bookId);
  }

  loadConversazioni() {
    return this.bookStore.loadConversazioni();
  }

  openConversazione(bookId: number, convId?: number) {
    return this.bookStore.openConversazione(bookId, convId);
  }

  closeConversazione() {
    this.bookStore.closeConversazione();
  }

  loadBookDetail(bookId: number) {
    return this.bookStore.loadBookDetail(bookId);
  }

  clearBookDetail() {
    this.bookStore.clearBookDetail();
  }

  inviaMessaggio(bookId: number, contenuto: string, conversationId?: number) {
    return this.bookStore.inviaMessaggio(bookId, contenuto, conversationId);
  }

  eliminaMessaggio(messageId: number) {
    return this.bookStore.eliminaMessaggio(messageId);
  }

  eliminaConversazione(convId: number) {
    return this.bookStore.eliminaConversazione(convId);
  }

  handleIncomingBookMessage(message: BookMessageDTO) {
    this.bookStore.handleIncomingBookMessage(message);
  }

  // ============================================================================
  // UTILITY
  // ============================================================================

  clear(): void {
    this._activeTab.set('compra');
    this._sellModalOpen.set(false);
    this.bookStore.clear();
  }
}
