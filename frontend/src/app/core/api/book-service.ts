import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  BookResponseDTO,
  BookSummaryDTO,
  BookConversationDTO,
  BookMessageDTO,
  CreaLibroRequestDTO,
  ModificaLibroRequestDTO,
  PageResponse,
} from '../../models';

@Injectable({
  providedIn: 'root',
})
export class BookService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/books`;

  // ── CATALOGO ────────────────────────────────────────────────────────────────

  /** GET /api/books — libri disponibili (esclusi i propri) */
  getLibriDisponibili(page = 0, size = 20): Observable<PageResponse<BookSummaryDTO>> {
    const params = new HttpParams()
      .set('page', page)
      .set('size', size)
      .set('sort', 'createdAt,desc');
    return this.http.get<PageResponse<BookSummaryDTO>>(this.baseUrl, { params });
  }

  /** GET /api/books/search — ricerca con filtri */
  cercaLibri(
    q?: string,
    anno?: string,
    materia?: string,
    condizione?: string,
    prezzoMax?: number,
    page = 0,
    size = 20
  ): Observable<PageResponse<BookSummaryDTO>> {
    let params = new HttpParams()
      .set('page', page)
      .set('size', size)
      .set('sort', 'createdAt,desc');
    if (q) params = params.set('q', q);
    if (anno) params = params.set('anno', anno);
    if (materia) params = params.set('materia', materia);
    if (condizione) params = params.set('condizione', condizione);
    if (prezzoMax != null) params = params.set('prezzoMax', prezzoMax);
    return this.http.get<PageResponse<BookSummaryDTO>>(`${this.baseUrl}/search`, { params });
  }

  /** GET /api/books/{id} — dettaglio libro */
  getDettaglio(bookId: number): Observable<BookResponseDTO> {
    return this.http.get<BookResponseDTO>(`${this.baseUrl}/${bookId}`);
  }

  // ── PROPRI ANNUNCI ───────────────────────────────────────────────────────────

  /** GET /api/books/miei — propri annunci */
  getMieiAnnunci(page = 0, size = 20): Observable<PageResponse<BookResponseDTO>> {
    const params = new HttpParams()
      .set('page', page)
      .set('size', size)
      .set('sort', 'createdAt,desc');
    return this.http.get<PageResponse<BookResponseDTO>>(`${this.baseUrl}/miei`, { params });
  }

  /** POST /api/books — pubblica nuovo annuncio */
  creaLibro(request: CreaLibroRequestDTO): Observable<BookResponseDTO> {
    return this.http.post<BookResponseDTO>(this.baseUrl, request);
  }

  /** PUT /api/books/{id} — modifica annuncio */
  modificaLibro(bookId: number, request: ModificaLibroRequestDTO): Observable<BookResponseDTO> {
    return this.http.put<BookResponseDTO>(`${this.baseUrl}/${bookId}`, request);
  }

  /** DELETE /api/books/{id} — elimina annuncio */
  eliminaLibro(bookId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${bookId}`);
  }

  /** DELETE /api/books/images — cleanup Cloudinary su annulla */
  deleteImages(frontImageUrl: string, backImageUrl?: string): Observable<void> {
    const urls = [frontImageUrl];
    if (backImageUrl) urls.push(backImageUrl);
    return this.http.delete<void>(`${this.baseUrl}/images`, { body: urls });
  }

  /** PATCH /api/books/{id}/stato — aggiorna stato libro */
  aggiornaStato(bookId: number, stato: string): Observable<BookResponseDTO> {
    return this.http.patch<BookResponseDTO>(`${this.baseUrl}/${bookId}/stato`, { stato });
  }

  // ── CLEANUP CLOUDINARY ───────────────────────────────────────────────────────

  /**
   * DELETE /api/books/images
   * Elimina immagini orfane da Cloudinary quando l'utente annulla il modal
   * prima di pubblicare il libro.
   */
  eliminaImmagini(urls: string[]): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/images`, { body: urls });
  }

  // ── CONVERSAZIONI ────────────────────────────────────────────────────────────

  /** GET /api/books/conversations — lista conversazioni (venditore + acquirente) */
  getConversazioni(): Observable<BookConversationDTO[]> {
    return this.http.get<BookConversationDTO[]>(`${this.baseUrl}/conversations`);
  }

  /**
   * GET /api/books/{id}/conversations/mine
   * Conversazione corrente per un libro specifico.
   * Restituisce 404 se non ancora iniziata (nessun messaggio inviato).
   */
  getConversazioneMia(bookId: number): Observable<BookConversationDTO> {
    return this.http.get<BookConversationDTO>(`${this.baseUrl}/${bookId}/conversations/mine`);
  }

  /** GET /api/books/conversations/{convId} — conversazione per ID (usato dal venditore) */
  getConversazioneById(convId: number): Observable<BookConversationDTO> {
    return this.http.get<BookConversationDTO>(`${this.baseUrl}/conversations/${convId}`);
  }

  /** GET /api/books/conversations/{convId}/messages — messaggi di una conversazione */
  getMessaggi(convId: number, page = 0, size = 50): Observable<PageResponse<BookMessageDTO>> {
    const params = new HttpParams()
      .set('page', page)
      .set('size', size)
      .set('sort', 'createdAt,asc');
    return this.http.get<PageResponse<BookMessageDTO>>(
      `${this.baseUrl}/conversations/${convId}/messages`,
      { params }
    );
  }

  /**
   * POST /api/books/{id}/messages
   * Invia messaggio (findOrCreate della conversazione al primo invio).
   */
  inviaMessaggio(bookId: number, contenuto: string, conversationId?: number): Observable<BookMessageDTO> {
    return this.http.post<BookMessageDTO>(`${this.baseUrl}/${bookId}/messages`, { contenuto, conversationId });
  }

  /** DELETE /api/books/messages/{messageId} — elimina messaggio (soft delete) */
  eliminaMessaggio(messageId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/messages/${messageId}`);
  }

  /** DELETE /api/books/conversations/{convId} — nasconde conversazione */
  eliminaConversazione(convId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/conversations/${convId}`);
  }

  /** PATCH /api/books/conversations/{convId}/read — segna come letti */
  segnaLetto(convId: number): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/conversations/${convId}/read`, {});
  }
}
