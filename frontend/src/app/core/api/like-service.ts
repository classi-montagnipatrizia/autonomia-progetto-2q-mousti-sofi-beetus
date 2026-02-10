import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { PageResponse, UserSummaryDTO } from '../../models';

@Injectable({
  providedIn: 'root',
})
export class LikeService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/posts`;

  /**
   * Toggle like su un post (aggiunge o rimuove)
   *
   * Endpoint: POST /api/posts/{postId}/likes
   * Autenticazione: richiesta
   *
   * Comportamento toggle tipico dei social media:
   * - Se l'utente non ha messo like, il like viene aggiunto
   * - Se l'utente ha già messo like, il like viene rimosso
   * - L'utente può mettere like anche ai propri post
   *
   * @param postId ID del post
   * @returns Observable con stato like, conteggio aggiornato e messaggio
   */
  toggleLike(postId: number): Observable<LikeToggleResponse> {
    return this.http.post<LikeToggleResponse>(`${this.baseUrl}/${postId}/likes`, {});
  }

  /**
   * Ottiene la lista paginata degli utenti che hanno messo like al post
   *
   * Endpoint: GET /api/posts/{postId}/likes
   * Autenticazione: richiesta
   *
   * Restituisce una lista paginata di utenti ordinati per data del like
   * (più recenti prima)
   * Utilizzato per mostrare "chi ha messo like"
   *
   * @param postId ID del post
   * @param page numero pagina (default 0)
   * @param size elementi per pagina (default 20)
   */
  getPostLikes(
    postId: number,
    page: number = 0,
    size: number = 20
  ): Observable<PageResponse<UserSummaryDTO>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<PageResponse<UserSummaryDTO>>(`${this.baseUrl}/${postId}/likes`, {
      params,
    });
  }

  /**
   * Verifica se l'utente corrente ha messo like al post
   *
   * Endpoint: GET /api/posts/{postId}/likes/check
   * Autenticazione: richiesta
   *
   * Utilizzato per determinare lo stato iniziale del bottone like
   * quando si carica un post
   *
   * @param postId ID del post
   * @returns Observable con campo hasLiked (boolean)
   */
  checkLike(postId: number): Observable<LikeCheckResponse> {
    return this.http.get<LikeCheckResponse>(`${this.baseUrl}/${postId}/likes/check`);
  }
}

/**
 * Risposta del toggle like
 * Restituita dall'endpoint POST /api/posts/{postId}/likes
 */
export interface LikeToggleResponse {
  /** True se il like è stato aggiunto, false se è stato rimosso */
  liked: boolean;

  /** Conteggio aggiornato dei like sul post */
  likesCount: number;

  /** Messaggio descrittivo dell'operazione ("Like aggiunto" o "Like rimosso") */
  message: string;
}

/**
 * Risposta della verifica like
 * Restituita dall'endpoint GET /api/posts/{postId}/likes/check
 */
export interface LikeCheckResponse {
  /** True se l'utente ha messo like al post, false altrimenti */
  hasLiked: boolean;
}
