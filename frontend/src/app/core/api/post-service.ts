import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import {
  CreaPostRequestDTO,
  ModificaPostRequestDTO,
  PostResponseDTO,
  PostDettaglioResponseDTO,
  PageResponse,
} from '../../models';

@Injectable({
  providedIn: 'root',
})
export class PostService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/posts`;

  /**
   * Crea un nuovo post
   *
   * Endpoint: POST /api/posts
   * Autenticazione: richiesta
   *
   * Il post deve contenere almeno un contenuto testuale o un'immagine
   *
   * @param request DTO con contenuto e/o URL immagine
   */
  createPost(request: CreaPostRequestDTO): Observable<PostResponseDTO> {
    return this.http.post<PostResponseDTO>(this.baseUrl, request);
  }

  /**
   * Ottiene il feed dei post
   *
   * Endpoint: GET /api/posts
   * Autenticazione: richiesta
   *
   * Restituisce tutti i post visibili all'utente, paginati e ordinati
   * per data di creazione (più recenti prima)
   *
   * @param page numero pagina (default 0)
   * @param size elementi per pagina (default 20)
   */
  getFeed(page: number = 0, size: number = 20): Observable<PageResponse<PostResponseDTO>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<PageResponse<PostResponseDTO>>(this.baseUrl, { params });
  }

  /**
   * Ottiene il dettaglio completo di un post con tutti i commenti
   *
   * Endpoint: GET /api/posts/{postId}
   * Autenticazione: richiesta
   *
   * Include la struttura gerarchica dei commenti (massimo 2 livelli)
   *
   * @param postId ID del post da visualizzare
   */
  getPostById(postId: number): Observable<PostDettaglioResponseDTO> {
    return this.http.get<PostDettaglioResponseDTO>(`${this.baseUrl}/${postId}`);
  }

  /**
   * Ottiene tutti i post di un utente specifico
   *
   * Endpoint: GET /api/posts/user/{userId}
   * Autenticazione: richiesta
   *
   * Utilizzato nella pagina profilo per visualizzare i post dell'utente
   *
   * @param userId ID dell'utente
   * @param page numero pagina (default 0)
   * @param size elementi per pagina (default 20)
   */
  getUserPosts(
    userId: number,
    page: number = 0,
    size: number = 20
  ): Observable<PageResponse<PostResponseDTO>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<PageResponse<PostResponseDTO>>(`${this.baseUrl}/user/${userId}`, {
      params,
    });
  }

  /**
   * Modifica il contenuto testuale di un post esistente
   *
   * Endpoint: PUT /api/posts/{postId}
   * Autenticazione: richiesta
   *
   * Può modificare solo il proprio post
   * Non permette di modificare l'immagine (solo il testo)
   *
   * @param postId ID del post da modificare
   * @param request DTO con nuovo contenuto
   */
  updatePost(postId: number, request: ModificaPostRequestDTO): Observable<PostResponseDTO> {
    return this.http.put<PostResponseDTO>(`${this.baseUrl}/${postId}`, request);
  }

  /**
   * Elimina un post esistente
   *
   * Endpoint: DELETE /api/posts/{postId}
   * Autenticazione: richiesta
   *
   * Può eliminare solo il proprio post
   * L'eliminazione è permanente e rimuove anche commenti e like associati
   * Restituisce 204 No Content
   *
   * @param postId ID del post da eliminare
   */
  deletePost(postId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${postId}`);
  }

  /**
   * Nasconde un post dal proprio feed
   *
   * Endpoint: POST /api/posts/{postId}/hide
   * Autenticazione: richiesta
   *
   * Il post non verrà più mostrato nel feed o nel profilo dell'autore
   * Utile per nascondere spoiler o contenuti non desiderati
   *
   * @param postId ID del post da nascondere
   */
  hidePost(postId: number): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${postId}/hide`, {});
  }

  /**
   * Mostra un post precedentemente nascosto
   *
   * Endpoint: DELETE /api/posts/{postId}/hide
   * Autenticazione: richiesta
   *
   * Annulla l'operazione di nascondimento, rendendo il post nuovamente visibile
   *
   * @param postId ID del post da mostrare
   */
  unhidePost(postId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${postId}/hide`);
  }

  /**
   * Cerca post per contenuto testuale
   *
   * Endpoint: GET /api/posts/search?q={searchTerm}
   * Autenticazione: richiesta
   *
   * Ricerca case-insensitive nel contenuto dei post
   *
   * @param searchTerm termine di ricerca
   * @param page numero pagina (default 0)
   * @param size elementi per pagina (default 20)
   */
  searchPosts(
    searchTerm: string,
    page: number = 0,
    size: number = 20
  ): Observable<PageResponse<PostResponseDTO>> {
    const params = new HttpParams()
      .set('q', searchTerm)
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<PageResponse<PostResponseDTO>>(`${this.baseUrl}/search`, { params });
  }
}
