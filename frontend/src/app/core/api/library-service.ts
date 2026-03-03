import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Observable, of, delay } from 'rxjs';
import {
  BookListingResponseDTO,
  BookListingFilters,
  BookListingStatus,
  BookCondition,
  BookSubject,
  CreaBookListingRequestDTO,
  LibraryConversationResponseDTO,
  LibraryMessageResponseDTO,
  PageResponse,
  UserSummaryDTO,
} from '../../models';

// ============================================================================
// DATI MOCK (da rimuovere quando l'API sarà pronta)
// ============================================================================

const MOCK_USERS: UserSummaryDTO[] = [
  { id: 1, username: 'mario', nomeCompleto: 'Mario Rossi', profilePictureUrl: null, isOnline: true, classroom: '5IA' },
  { id: 2, username: 'lucia', nomeCompleto: 'Lucia Bianchi', profilePictureUrl: null, isOnline: false, classroom: '3IB' },
  { id: 3, username: 'paolo', nomeCompleto: 'Paolo Verdi', profilePictureUrl: null, isOnline: true, classroom: '1IC' },
  { id: 4, username: 'giulia', nomeCompleto: 'Giulia Neri', profilePictureUrl: null, isOnline: false, classroom: '4IA' },
];

const MOCK_LISTINGS: BookListingResponseDTO[] = [
  {
    id: 1,
    titolo: 'Matematica Blu 2.0 - Volume 3',
    autore: 'Bergamini, Barozzi, Trifone',
    isbn: '9788808537010',
    anno: 3,
    materia: BookSubject.MATEMATICA,
    condizione: BookCondition.COME_NUOVO,
    prezzo: 15,
    descrizione: 'Libro in ottime condizioni, usato per un solo anno scolastico.',
    imageUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400',
    imageUrlRetro: null,
    venditore: MOCK_USERS[0],
    stato: BookListingStatus.DISPONIBILE,
    richiedente: null,
    acquirente: null,
    createdAt: '2026-01-15T10:00:00Z',
    updatedAt: '2026-01-15T10:00:00Z',
  },
  {
    id: 2,
    titolo: 'I Promessi Sposi - Edizione integrale',
    autore: 'Alessandro Manzoni',
    isbn: null,
    anno: 2,
    materia: BookSubject.ITALIANO,
    condizione: BookCondition.BUONE_CONDIZIONI,
    prezzo: 8,
    descrizione: 'Qualche segno di usura sulla copertina, interno perfetto.',
    imageUrl: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400',
    imageUrlRetro: null,
    venditore: MOCK_USERS[1],
    stato: BookListingStatus.DISPONIBILE,
    richiedente: null,
    acquirente: null,
    createdAt: '2026-01-20T14:30:00Z',
    updatedAt: '2026-01-20T14:30:00Z',
  },
  {
    id: 3,
    titolo: 'Fisica! Le leggi della natura - Vol. 1',
    autore: 'Romeni',
    isbn: null,
    anno: 1,
    materia: BookSubject.FISICA,
    condizione: BookCondition.USATO,
    prezzo: 12,
    descrizione: 'Usato ma funzionale, alcune sottolineature a matita.',
    imageUrl: 'https://images.unsplash.com/photo-1589998059171-988d887df646?w=400',
    imageUrlRetro: null,
    venditore: MOCK_USERS[2],
    stato: BookListingStatus.DISPONIBILE,
    richiedente: null,
    acquirente: null,
    createdAt: '2026-02-01T09:15:00Z',
    updatedAt: '2026-02-01T09:15:00Z',
  },
  {
    id: 4,
    titolo: 'Grammar Files - Blue Edition',
    autore: 'Jordan, Fiocchi',
    isbn: null,
    anno: 0, // Tutti gli anni
    materia: BookSubject.INGLESE,
    condizione: BookCondition.COME_NUOVO,
    prezzo: 18,
    descrizione: 'Mai usato, comprato doppio per errore.',
    imageUrl: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400',
    imageUrlRetro: null,
    venditore: MOCK_USERS[3],
    stato: BookListingStatus.DISPONIBILE,
    richiedente: null,
    acquirente: null,
    createdAt: '2026-02-10T16:45:00Z',
    updatedAt: '2026-02-10T16:45:00Z',
  },
];

const MOCK_MY_LISTINGS: BookListingResponseDTO[] = [
  {
    ...MOCK_LISTINGS[0],
    id: 100,
    venditore: MOCK_USERS[0], // "io"
    stato: BookListingStatus.DISPONIBILE,
  },
  {
    ...MOCK_LISTINGS[3],
    id: 101,
    venditore: MOCK_USERS[0],
    stato: BookListingStatus.RICHIESTO,
    richiedente: MOCK_USERS[1],
  },
  {
    ...MOCK_LISTINGS[2],
    id: 102,
    venditore: MOCK_USERS[0],
    stato: BookListingStatus.VENDUTO,
    acquirente: MOCK_USERS[2],
    prezzo: 12,
  },
];

const MOCK_CONVERSATIONS: LibraryConversationResponseDTO[] = [
  {
    id: 1,
    annuncio: MOCK_LISTINGS[0],
    altroUtente: MOCK_USERS[0],
    ruolo: 'ACQUIRENTE',
    ultimoMessaggio: 'Si, il libro è ancora disponibile!',
    messaggiNonLetti: 2,
    ultimaAttivita: '2026-02-24T14:32:00Z',
  },
  {
    id: 2,
    annuncio: MOCK_LISTINGS[3],
    altroUtente: MOCK_USERS[1],
    ruolo: 'VENDITORE',
    ultimoMessaggio: 'Perfetto, ci troviamo domani a scuola',
    messaggiNonLetti: 0,
    ultimaAttivita: '2026-02-23T18:00:00Z',
  },
  {
    id: 3,
    annuncio: MOCK_LISTINGS[2],
    altroUtente: MOCK_USERS[2],
    ruolo: 'ACQUIRENTE',
    ultimoMessaggio: 'Ok, grazie mille!',
    messaggiNonLetti: 0,
    ultimaAttivita: '2026-02-21T10:00:00Z',
  },
];

const MOCK_CHAT_MESSAGES: LibraryMessageResponseDTO[] = [
  { id: 1, mittente: MOCK_USERS[0], contenuto: 'Ciao! Ho visto che sei interessato al libro di matematica. Hai qualche domanda?', createdAt: '2026-02-24T14:28:00Z' },
  { id: 2, mittente: MOCK_USERS[1], contenuto: 'Ciao! Si, il libro è ancora disponibile? In che condizioni è?', createdAt: '2026-02-24T14:30:00Z' },
  { id: 3, mittente: MOCK_USERS[0], contenuto: 'Si, il libro è ancora disponibile! È in ottime condizioni, usato solo un anno. Nessun appunto o sottolineatura.', createdAt: '2026-02-24T14:32:00Z' },
  { id: 4, mittente: MOCK_USERS[1], contenuto: 'Perfetto! Possiamo vederci domani a scuola per lo scambio?', createdAt: '2026-02-24T14:33:00Z' },
];

// ============================================================================
// SERVICE
// ============================================================================

@Injectable({
  providedIn: 'root',
})
export class LibraryService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/library`;

  /**
   * Ottieni tutti gli annunci disponibili (con filtri e paginazione)
   * TODO: sostituire mock con HTTP call reale
   */
  getListings(
    filters: BookListingFilters = {},
    page: number = 0,
    size: number = 20
  ): Observable<PageResponse<BookListingResponseDTO>> {
    // Mock: filtra e impagina localmente
    let filtered = [...MOCK_LISTINGS];

    if (filters.search) {
      const q = filters.search.toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.titolo.toLowerCase().includes(q) ||
          b.autore.toLowerCase().includes(q) ||
          (b.isbn && b.isbn.includes(q))
      );
    }
    if (filters.anno != null) {
      filtered = filtered.filter((b) => b.anno === filters.anno);
    }
    if (filters.materia) {
      filtered = filtered.filter((b) => b.materia === filters.materia);
    }
    if (filters.condizione) {
      filtered = filtered.filter((b) => b.condizione === filters.condizione);
    }
    if (filters.prezzoMin != null) {
      filtered = filtered.filter((b) => b.prezzo >= filters.prezzoMin!);
    }
    if (filters.prezzoMax != null) {
      filtered = filtered.filter((b) => b.prezzo <= filters.prezzoMax!);
    }

    // Sort
    if (filters.sort === 'prezzo_asc') {
      filtered.sort((a, b) => a.prezzo - b.prezzo);
    } else if (filters.sort === 'prezzo_desc') {
      filtered.sort((a, b) => b.prezzo - a.prezzo);
    } else {
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    const start = page * size;
    const content = filtered.slice(start, start + size);

    return of<PageResponse<BookListingResponseDTO>>({
      content,
      totalElements: filtered.length,
      totalPages: Math.ceil(filtered.length / size),
      size,
      number: page,
      first: page === 0,
      last: start + size >= filtered.length,
      empty: content.length === 0,
    }).pipe(delay(600));

    // TODO: API reale
    // const params = new HttpParams()
    //   .set('page', page.toString())
    //   .set('size', size.toString());
    // return this.http.get<PageResponse<BookListingResponseDTO>>(this.baseUrl, { params });
  }

  /**
   * Ottieni i miei annunci
   */
  getMyListings(page: number = 0, size: number = 20): Observable<PageResponse<BookListingResponseDTO>> {
    const content = MOCK_MY_LISTINGS;
    return of<PageResponse<BookListingResponseDTO>>({
      content,
      totalElements: content.length,
      totalPages: 1,
      size,
      number: page,
      first: true,
      last: true,
      empty: content.length === 0,
    }).pipe(delay(600));

    // TODO: API reale
    // const params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    // return this.http.get<PageResponse<BookListingResponseDTO>>(`${this.baseUrl}/mine`, { params });
  }

  /**
   * Crea un nuovo annuncio
   */
  createListing(request: CreaBookListingRequestDTO): Observable<BookListingResponseDTO> {
    const newListing: BookListingResponseDTO = {
      id: Math.floor(Math.random() * 10000),
      ...request,
      isbn: request.isbn || null,
      descrizione: request.descrizione || null,
      imageUrlRetro: request.imageUrlRetro || null,
      venditore: MOCK_USERS[0],
      stato: BookListingStatus.DISPONIBILE,
      richiedente: null,
      acquirente: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return of(newListing).pipe(delay(800));

    // TODO: API reale
    // return this.http.post<BookListingResponseDTO>(this.baseUrl, request);
  }

  /**
   * Aggiorna lo stato di un annuncio (disponibile → richiesto → venduto)
   */
  updateListingStatus(listingId: number, status: BookListingStatus): Observable<BookListingResponseDTO> {
    const listing = MOCK_MY_LISTINGS.find((l) => l.id === listingId);
    if (listing) {
      listing.stato = status;
      listing.updatedAt = new Date().toISOString();
    }
    return of(listing!).pipe(delay(400));

    // TODO: API reale
    // return this.http.patch<BookListingResponseDTO>(`${this.baseUrl}/${listingId}/status`, { status });
  }

  /**
   * Elimina un annuncio
   */
  deleteListing(listingId: number): Observable<void> {
    return of(void 0).pipe(delay(400));

    // TODO: API reale
    // return this.http.delete<void>(`${this.baseUrl}/${listingId}`);
  }

  /**
   * Ottieni conversazioni della libreria
   */
  getConversations(): Observable<LibraryConversationResponseDTO[]> {
    return of(MOCK_CONVERSATIONS).pipe(delay(500));

    // TODO: API reale
    // return this.http.get<LibraryConversationResponseDTO[]>(`${this.baseUrl}/conversations`);
  }

  /**
   * Ottieni messaggi di una conversazione
   */
  getConversationMessages(conversationId: number): Observable<LibraryMessageResponseDTO[]> {
    return of(MOCK_CHAT_MESSAGES).pipe(delay(400));

    // TODO: API reale
    // return this.http.get<LibraryMessageResponseDTO[]>(`${this.baseUrl}/conversations/${conversationId}/messages`);
  }

  /**
   * Invia un messaggio in una conversazione
   */
  sendMessage(conversationId: number, contenuto: string): Observable<LibraryMessageResponseDTO> {
    const msg: LibraryMessageResponseDTO = {
      id: Math.floor(Math.random() * 10000),
      mittente: MOCK_USERS[0],
      contenuto,
      createdAt: new Date().toISOString(),
    };
    return of(msg).pipe(delay(300));

    // TODO: API reale
    // return this.http.post<LibraryMessageResponseDTO>(`${this.baseUrl}/conversations/${conversationId}/messages`, { contenuto });
  }

  /**
   * Ottieni un singolo annuncio per ID
   */
  getListingById(id: number): Observable<BookListingResponseDTO> {
    const all = [...MOCK_LISTINGS, ...MOCK_MY_LISTINGS];
    const found = all.find((l) => l.id === id) ?? MOCK_LISTINGS[0];
    return of(found).pipe(delay(500));

    // TODO: API reale
    // return this.http.get<BookListingResponseDTO>(`${this.baseUrl}/${id}`);
  }

  /**
   * Richiedi un libro (cambia stato a RICHIESTO)
   */
  requestListing(listingId: number): Observable<BookListingResponseDTO> {
    const listing = MOCK_LISTINGS.find((l) => l.id === listingId);
    if (listing) {
      listing.stato = BookListingStatus.RICHIESTO;
      listing.richiedente = MOCK_USERS[0];
      listing.updatedAt = new Date().toISOString();
    }
    return of(listing!).pipe(delay(600));

    // TODO: API reale
    // return this.http.post<BookListingResponseDTO>(`${this.baseUrl}/${listingId}/request`, {});
  }

  /**
   * Conteggio messaggi non letti nelle conversazioni della libreria
   */
  getUnreadConversationsCount(): Observable<number> {
    const count = MOCK_CONVERSATIONS.reduce((sum, c) => sum + c.messaggiNonLetti, 0);
    return of(count).pipe(delay(200));

    // TODO: API reale
    // return this.http.get<CountResponse>(`${this.baseUrl}/conversations/unread-count`).pipe(map(r => r.unreadCount));
  }
}
