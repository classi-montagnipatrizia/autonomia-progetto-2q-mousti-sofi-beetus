import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { CreaCommentoRequestDTO, CommentResponseDTO } from '../../models';

@Injectable({
  providedIn: 'root',
})
export class CommentService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}`;

  /**
   * Crea un nuovo commento o una risposta
   *
   * Endpoint: POST /api/posts/{postId}/comments
   * Autenticazione: richiesta
   *
   * Gestisce sia commenti principali che risposte:
   * - Per commento principale: non includere parentCommentId nel DTO
   * - Per risposta: includere parentCommentId nel DTO
   *
   * @param postId ID del post a cui commentare
   * @param request DTO con contenuto e eventuale parentCommentId
   */
  createComment(postId: number, request: CreaCommentoRequestDTO): Observable<CommentResponseDTO> {
    return this.http.post<CommentResponseDTO>(`${this.baseUrl}/posts/${postId}/comments`, request);
  }

  /**
   * Ottiene tutti i commenti di un post con struttura gerarchica
   *
   * Endpoint: GET /api/posts/{postId}/comments
   * Autenticazione: richiesta
   *
   * Restituisce i commenti con struttura ad albero:
   * - Ogni commento principale ha una lista "risposte"
   * - Le risposte hanno il campo "parentCommentId" valorizzato
   * - Massimo 2 livelli di profondità
   *
   * @param postId ID del post
   */
  getPostComments(postId: number): Observable<CommentResponseDTO[]> {
    return this.http.get<CommentResponseDTO[]>(`${this.baseUrl}/posts/${postId}/comments`);
  }

  /**
   * Modifica il contenuto di un commento esistente
   *
   * Endpoint: PUT /api/comments/{commentId}
   * Autenticazione: richiesta
   *
   * Solo l'autore può modificare il proprio commento
   * Il campo updatedAt viene aggiornato automaticamente
   *
   * @param commentId ID del commento da modificare
   * @param contenuto Nuovo contenuto del commento
   */
  updateComment(commentId: number, contenuto: string): Observable<CommentResponseDTO> {
    return this.http.put<CommentResponseDTO>(`${this.baseUrl}/comments/${commentId}`, {
      contenuto,
    });
  }

  /**
   * Elimina un commento (soft delete)
   *
   * Endpoint: DELETE /api/comments/{commentId}
   * Autenticazione: richiesta
   *
   * Solo l'autore può eliminare il proprio commento
   * Il commento viene marcato come eliminato ma non rimosso fisicamente
   * Se ha risposte, queste rimangono visibili
   * Restituisce 204 No Content
   *
   * @param commentId ID del commento da eliminare
   */
  deleteComment(commentId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/comments/${commentId}`);
  }

  /**
   * Nasconde un commento dalla propria visualizzazione
   *
   * Endpoint: POST /api/comments/{commentId}/hide
   * Autenticazione: richiesta
   *
   * Il commento non sarà più visibile all'utente corrente
   * Utile per nascondere contenuti offensivi o spam
   *
   * @param commentId ID del commento da nascondere
   */
  hideComment(commentId: number): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/comments/${commentId}/hide`, {});
  }

  /**
   * Mostra un commento precedentemente nascosto
   *
   * Endpoint: DELETE /api/comments/{commentId}/hide
   * Autenticazione: richiesta
   *
   * Annulla l'operazione di nascondimento
   *
   * @param commentId ID del commento da mostrare
   */
  unhideComment(commentId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/comments/${commentId}/hide`);
  }
}
