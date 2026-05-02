import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { BookService } from '../api/book-service';
import { LoggerService } from '../services/logger.service';
import {
  BookResponseDTO,
  BookSummaryDTO,
  BookConversationDTO,
  BookMessageDTO,
} from '../../models';

export interface BookFilters {
  q?: string;
  anno?: string;
  materia?: string;
  condizione?: string;
  prezzoMax?: number;
}

@Injectable({
  providedIn: 'root',
})
export class BookStore {
  private readonly bookService = inject(BookService);
  private readonly logger = inject(LoggerService);

  // ============================================================================
  // SIGNALS PRIVATI
  // ============================================================================

  private readonly _availableBooks = signal<BookSummaryDTO[]>([]);
  private readonly _myListings = signal<BookResponseDTO[]>([]);
  private readonly _conversations = signal<BookConversationDTO[]>([]);
  private readonly _currentConversationMessages = signal<BookMessageDTO[]>([]);
  private readonly _currentConversation = signal<BookConversationDTO | null>(null);
  private readonly _filters = signal<BookFilters>({});
  private readonly _isLoading = signal(false);
  private readonly _hasMoreAvailable = signal(true);
  private readonly _hasMoreListings = signal(true);
  private readonly _currentPageAvailable = signal(0);
  private readonly _currentPageListings = signal(0);
  private readonly _bookDetail = signal<BookResponseDTO | null>(null);
  private readonly _bookDetailLoading = signal(false);

  // ============================================================================
  // SIGNALS PUBBLICI READONLY
  // ============================================================================

  readonly availableBooks = this._availableBooks.asReadonly();
  readonly myListings = this._myListings.asReadonly();
  readonly conversations = this._conversations.asReadonly();
  readonly currentConversationMessages = this._currentConversationMessages.asReadonly();
  readonly currentConversation = this._currentConversation.asReadonly();
  readonly filters = this._filters.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly hasMoreAvailable = this._hasMoreAvailable.asReadonly();
  readonly hasMoreListings = this._hasMoreListings.asReadonly();
  readonly bookDetail = this._bookDetail.asReadonly();
  readonly bookDetailLoading = this._bookDetailLoading.asReadonly();

  // ============================================================================
  // COMPUTED
  // ============================================================================

  readonly hasActiveFilters = computed(() => {
    const f = this._filters();
    return !!(f.q || f.anno || f.materia || f.condizione || f.prezzoMax != null);
  });

  readonly unreadConversationsCount = computed(() =>
    this._conversations().reduce((sum, c) => sum + (c.messaggiNonLetti ?? 0), 0)
  );

  // ============================================================================
  // CATALOGO
  // ============================================================================

  async loadAvailableBooks(page = 0): Promise<void> {
    this._isLoading.set(true);
    try {
      const f = this._filters();
      const hasFilters = this.hasActiveFilters();
      const response = hasFilters
        ? await firstValueFrom(
            this.bookService.cercaLibri(f.q, f.anno, f.materia, f.condizione, f.prezzoMax, page)
          )
        : await firstValueFrom(this.bookService.getLibriDisponibili(page));

      if (!response) return;

      if (page === 0) {
        this._availableBooks.set(response.content);
      } else {
        this._availableBooks.update(curr => [...curr, ...response.content]);
      }

      this._currentPageAvailable.set(page);
      const isLast = response.page !== undefined
            ? response.page.number >= response.page.totalPages - 1
            : response.last || false;
      this._hasMoreAvailable.set(!isLast);
    } catch (error) {
      this.logger.error('Errore caricamento libri disponibili', error);
    } finally {
      this._isLoading.set(false);
    }
  }

  async loadMoreAvailable(): Promise<void> {
    if (!this._hasMoreAvailable() || this._isLoading()) return;
    await this.loadAvailableBooks(this._currentPageAvailable() + 1);
  }

  // ============================================================================
  // FILTRI
  // ============================================================================

  setFilters(filters: BookFilters): void {
    this._filters.set(filters);
    this._currentPageAvailable.set(0);
    this._hasMoreAvailable.set(true);
    this.loadAvailableBooks(0);
  }

  clearFilters(): void {
    this._filters.set({});
    this._currentPageAvailable.set(0);
    this._hasMoreAvailable.set(true);
    this.loadAvailableBooks(0);
  }

  // ============================================================================
  // PROPRI ANNUNCI
  // ============================================================================

  async loadMyListings(page = 0): Promise<void> {
    this._isLoading.set(true);
    try {
      const response = await firstValueFrom(this.bookService.getMieiAnnunci(page));
      if (!response) return;

      if (page === 0) {
        this._myListings.set(response.content);
      } else {
        this._myListings.update(curr => [...curr, ...response.content]);
      }

      this._currentPageListings.set(page);
      const isLast = response.page !== undefined
            ? response.page.number >= response.page.totalPages - 1
            : response.last || false;
      this._hasMoreListings.set(!isLast);
    } catch (error) {
      this.logger.error('Errore caricamento propri annunci', error);
    } finally {
      this._isLoading.set(false);
    }
  }

  async aggiornaStato(bookId: number, stato: string): Promise<void> {
    try {
      const updated = await firstValueFrom(this.bookService.aggiornaStato(bookId, stato));
      if (updated) {
        this._myListings.update(list =>
          list.map(b => (b.id === bookId ? updated : b))
        );
      }
    } catch (error) {
      this.logger.error('Errore aggiornamento stato libro', error);
      throw error;
    }
  }

  async eliminaLibro(bookId: number): Promise<void> {
    try {
      await firstValueFrom(this.bookService.eliminaLibro(bookId));
      this._myListings.update(list => list.filter(b => b.id !== bookId));
    } catch (error) {
      this.logger.error('Errore eliminazione libro', error);
      throw error;
    }
  }

  // ============================================================================
  // CONVERSAZIONI LIBRERIA
  // ============================================================================

  async loadConversazioni(): Promise<void> {
    this._isLoading.set(true);
    try {
      const list = await firstValueFrom(this.bookService.getConversazioni());
      if (list) this._conversations.set(list);
    } catch (error) {
      this.logger.error('Errore caricamento conversazioni libreria', error);
    } finally {
      this._isLoading.set(false);
    }
  }

  clearBookDetail(): void {
    this._bookDetail.set(null);
    this._bookDetailLoading.set(false);
  }

  closeConversazione(): void {
    this._currentConversation.set(null);
    this._currentConversationMessages.set([]);
  }

  async openConversazione(bookId: number, convId?: number): Promise<void> {
    this._isLoading.set(true);
    this._currentConversationMessages.set([]);
    this._currentConversation.set(null);
    try {
      // Se abbiamo un convId (venditore o buyer dalla lista messaggi), carica per ID
      const observable = convId
        ? this.bookService.getConversazioneById(convId)
        : this.bookService.getConversazioneMia(bookId);

      const conv = await firstValueFrom(observable);
      if (conv) {
        this._currentConversation.set(conv);
        await this.loadMessaggi(conv.id);
        await firstValueFrom(this.bookService.segnaLetto(conv.id));
        this._conversations.update(list =>
          list.map(c => (c.id === conv.id ? { ...c, messaggiNonLetti: 0 } : c))
        );
      }
    } catch (error: unknown) {
      // 404 = conversazione non ancora iniziata (solo per buyer senza convId), è normale
      if ((error as { status?: number })?.status !== 404) {
        this.logger.error('Errore apertura conversazione libro', error);
      }
    } finally {
      this._isLoading.set(false);
    }
  }

  private async loadMessaggi(convId: number): Promise<void> {
    const response = await firstValueFrom(this.bookService.getMessaggi(convId));
    if (response) this._currentConversationMessages.set(response.content);
  }

  async inviaMessaggio(bookId: number, contenuto: string, conversationId?: number): Promise<void> {
    try {
      const msg = await firstValueFrom(this.bookService.inviaMessaggio(bookId, contenuto, conversationId));
      if (!msg) return;

      this._currentConversationMessages.update(msgs => [...msgs, msg]);

      // Se la conversazione non era ancora aperta, impostala ora
      if (!this._currentConversation()) {
        await this.loadConversazioni();
        const conv = this._conversations().find(c => c.id === msg.conversationId);
        if (conv) this._currentConversation.set(conv);
      }
    } catch (error) {
      this.logger.error('Errore invio messaggio libro', error);
      throw error;
    }
  }

  /**
   * Gestisce un messaggio libro ricevuto via WebSocket.
   */
  handleIncomingBookMessage(message: BookMessageDTO): void {
    const currentConv = this._currentConversation();

    // Se il messaggio appartiene alla conversazione aperta
    if (currentConv && message.conversationId === currentConv.id) {
      const existingIndex = this._currentConversationMessages().findIndex(m => m.id === message.id);
      if (existingIndex >= 0) {
        // Aggiornamento messaggio esistente (es. eliminazione)
        this._currentConversationMessages.update(msgs =>
          msgs.map(m => m.id === message.id ? message : m)
        );
      } else {
        // Nuovo messaggio
        this._currentConversationMessages.update(msgs => [...msgs, message]);
      }
    }

    // Aggiorna la lista conversazioni con l'ultimo messaggio
    const existingConv = this._conversations().find(c => c.id === message.conversationId);
    if (existingConv) {
      this._conversations.update(list =>
        list.map(c => {
          if (c.id === message.conversationId) {
            return {
              ...c,
              ultimoMessaggio: message,
              messaggiNonLetti: currentConv?.id === message.conversationId
                ? c.messaggiNonLetti
                : (c.messaggiNonLetti ?? 0) + 1,
            };
          }
          return c;
        })
      );
    } else {
      // Nuova conversazione (primo messaggio): ricarica la lista dal server
      this.loadConversazioni();
    }
  }

  async eliminaMessaggio(messageId: number): Promise<void> {
    try {
      await firstValueFrom(this.bookService.eliminaMessaggio(messageId));
      this._currentConversationMessages.update(msgs =>
        msgs.map(m => m.id === messageId ? { ...m, isDeletedBySender: true, contenuto: '' } : m)
      );
    } catch (error) {
      this.logger.error('Errore eliminazione messaggio libro', error);
      throw error;
    }
  }

  async eliminaConversazione(convId: number): Promise<void> {
    try {
      await firstValueFrom(this.bookService.eliminaConversazione(convId));
      this._conversations.update(list => list.filter(c => c.id !== convId));
      if (this._currentConversation()?.id === convId) {
        this._currentConversation.set(null);
        this._currentConversationMessages.set([]);
      }
    } catch (error) {
      this.logger.error('Errore eliminazione conversazione libro', error);
      throw error;
    }
  }

  // ============================================================================
  // DETTAGLIO LIBRO
  // ============================================================================

  async loadBookDetail(bookId: number): Promise<void> {
    this._bookDetailLoading.set(true);
    try {
      const book = await firstValueFrom(this.bookService.getDettaglio(bookId));
      if (book) this._bookDetail.set(book);
    } catch (error) {
      this.logger.error('Errore caricamento dettaglio libro', error);
    } finally {
      this._bookDetailLoading.set(false);
    }
  }

  // ============================================================================
  // UTILITY
  // ============================================================================

  clear(): void {
    this._availableBooks.set([]);
    this._myListings.set([]);
    this._conversations.set([]);
    this._currentConversationMessages.set([]);
    this._currentConversation.set(null);
    this._filters.set({});
    this._isLoading.set(false);
    this._hasMoreAvailable.set(true);
    this._hasMoreListings.set(true);
    this._currentPageAvailable.set(0);
    this._currentPageListings.set(0);
    this._bookDetail.set(null);
    this._bookDetailLoading.set(false);
  }
}
