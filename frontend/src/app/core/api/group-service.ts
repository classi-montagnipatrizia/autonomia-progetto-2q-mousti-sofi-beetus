import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  GroupResponseDTO,
  GroupSummaryDTO,
  GroupMessageDTO,
  CreaGruppoRequestDTO,
  ModificaGruppoRequestDTO,
  InviaMessaggioGruppoRequestDTO,
  PageResponse,
} from '../../models';

@Injectable({
  providedIn: 'root',
})
export class GroupService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/groups`;

  // ── CRUD GRUPPO ──────────────────────────────────────────────────────────────

  /** POST /api/groups — crea gruppo (diventi admin) */
  creaGruppo(request: CreaGruppoRequestDTO): Observable<GroupResponseDTO> {
    return this.http.post<GroupResponseDTO>(this.baseUrl, request);
  }

  /** GET /api/groups/miei — lista gruppi di cui fai parte */
  getMieiGruppi(): Observable<GroupSummaryDTO[]> {
    return this.http.get<GroupSummaryDTO[]>(`${this.baseUrl}/miei`);
  }

  /** GET /api/groups/{id} — dettaglio gruppo con lista membri */
  getDettaglio(groupId: number): Observable<GroupResponseDTO> {
    return this.http.get<GroupResponseDTO>(`${this.baseUrl}/${groupId}`);
  }

  /** PUT /api/groups/{id} — modifica gruppo (solo admin) */
  modificaGruppo(groupId: number, request: ModificaGruppoRequestDTO): Observable<GroupResponseDTO> {
    return this.http.put<GroupResponseDTO>(`${this.baseUrl}/${groupId}`, request);
  }

  /** DELETE /api/groups/{id} — elimina gruppo (solo admin, cascade) */
  eliminaGruppo(groupId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${groupId}`);
  }

  // ── GESTIONE MEMBRI ──────────────────────────────────────────────────────────

  /** POST /api/groups/{id}/members/{userId} — aggiungi membro (solo admin) */
  aggiungiMembro(groupId: number, userId: number): Observable<GroupResponseDTO> {
    return this.http.post<GroupResponseDTO>(`${this.baseUrl}/${groupId}/members/${userId}`, {});
  }

  /** DELETE /api/groups/{id}/members/{userId} — rimuovi membro (solo admin) */
  rimuoviMembro(groupId: number, userId: number): Observable<GroupResponseDTO> {
    return this.http.delete<GroupResponseDTO>(`${this.baseUrl}/${groupId}/members/${userId}`);
  }

  /** DELETE /api/groups/{id}/leave — abbandona gruppo (non admin) */
  abbandonaGruppo(groupId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${groupId}/leave`);
  }

  // ── MESSAGGI ─────────────────────────────────────────────────────────────────

  /** GET /api/groups/{id}/messages — messaggi paginati (desc, dal più recente) */
  getMessaggi(groupId: number, page = 0, size = 30): Observable<PageResponse<GroupMessageDTO>> {
    const params = new HttpParams()
      .set('page', page)
      .set('size', size)
      .set('sort', 'createdAt,desc');
    return this.http.get<PageResponse<GroupMessageDTO>>(
      `${this.baseUrl}/${groupId}/messages`,
      { params }
    );
  }

  /** GET /api/groups/{id}/messages/search?q=... — cerca messaggi nel gruppo */
  searchMessages(groupId: number, query: string, page = 0, size = 20): Observable<PageResponse<GroupMessageDTO>> {
    const params = new HttpParams()
      .set('q', query)
      .set('page', page)
      .set('size', size);
    return this.http.get<PageResponse<GroupMessageDTO>>(
      `${this.baseUrl}/${groupId}/messages/search`,
      { params }
    );
  }

  /** POST /api/groups/{id}/messages — invia messaggio (testo o audio) */
  inviaMessaggio(
    groupId: number,
    request: InviaMessaggioGruppoRequestDTO
  ): Observable<GroupMessageDTO> {
    return this.http.post<GroupMessageDTO>(`${this.baseUrl}/${groupId}/messages`, request);
  }

  /** DELETE /api/groups/{groupId}/messages/{messageId} — elimina messaggio (solo mittente) */
  eliminaMessaggio(groupId: number, messageId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${groupId}/messages/${messageId}`);
  }

  /**
   * PATCH /api/groups/{id}/read
   * Aggiorna lastReadAt — chiamato all'apertura della chat per azzerare il badge unread.
   */
  segnaLetto(groupId: number): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/${groupId}/read`, {});
  }

  // ── TYPING INDICATORS ─────────────────────────────────────────────────────

  /** POST /api/groups/{id}/typing — segnala che stai scrivendo */
  setTyping(groupId: number): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${groupId}/typing`, {});
  }

  /** DELETE /api/groups/{id}/typing — segnala che hai smesso di scrivere */
  clearTyping(groupId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${groupId}/typing`);
  }
}
