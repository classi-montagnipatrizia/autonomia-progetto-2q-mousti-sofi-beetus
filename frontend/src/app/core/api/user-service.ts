import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import {
  AggiornaProfiloRequestDTO,
  CambiaPasswordRequestDTO,
  DisattivaAccountRequestDTO,
  MessageResponse,
  PageResponse,
  UserResponseDTO,
  UserStats,
  UserSummaryDTO,
} from '../../models';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/users`;

  /**
   * Ottiene il profilo completo dell'utente corrente
   *
   * Endpoint: GET /api/users/me
   * Autenticazione: richiesta
   */
  getMyProfile(): Observable<UserResponseDTO> {
    return this.http.get<UserResponseDTO>(`${this.baseUrl}/me`);
  }

  /**
   * Ottiene il profilo pubblico di un utente specifico
   *
   * Endpoint: GET /api/users/{userId}
   * Autenticazione: richiesta
   *
   * @param userId ID dell'utente da visualizzare
   */
  getUserProfile(userId: number): Observable<UserResponseDTO> {
    return this.http.get<UserResponseDTO>(`${this.baseUrl}/${userId}`);
  }

  /**
   * Aggiorna il profilo dell'utente corrente
   *
   * Endpoint: PUT /api/users/me
   * Autenticazione: richiesta
   *
   * Permette di modificare:
   * - Nome completo
   * - Bio
   * - URL immagine profilo
   *
   * @param request DTO con i campi da aggiornare
   */
  updateProfile(request: AggiornaProfiloRequestDTO): Observable<UserResponseDTO> {
    return this.http.put<UserResponseDTO>(`${this.baseUrl}/me`, request);
  }

  /**
   * Cambia la password dell'utente corrente
   *
   * Endpoint: PUT /api/users/me/password
   * Autenticazione: richiesta
   *
   * @param request DTO con vecchia e nuova password
   */
  changePassword(request: CambiaPasswordRequestDTO): Observable<MessageResponse> {
    return this.http.put<MessageResponse>(`${this.baseUrl}/me/password`, request);
  }

  /**
   * Cerca utenti per username o nome completo
   *
   * Endpoint: GET /api/users/search?q={searchTerm}
   * Autenticazione: richiesta
   *
   * Ricerca case-insensitive su username e nome completo
   *
   * @param searchTerm termine di ricerca
   * @param page numero pagina (default 0)
   * @param size elementi per pagina (default 20)
   * @param sort campo ordinamento (default 'username')
   */
  searchUsers(
    searchTerm: string,
    page: number = 0,
    size: number = 20,
    sort: string = 'username'
  ): Observable<PageResponse<UserSummaryDTO>> {
    const params = new HttpParams()
      .set('q', searchTerm)
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort);

    return this.http.get<PageResponse<UserSummaryDTO>>(`${this.baseUrl}/search`, { params });
  }

  /**
   * Ottiene tutti gli utenti attivi della piattaforma
   *
   * Endpoint: GET /api/users
   * Autenticazione: richiesta
   *
   * Esclude account disattivati
   *
   * @param page numero pagina (default 0)
   * @param size elementi per pagina (default 20)
   * @param sort campo ordinamento (default 'username')
   */
  getAllUsers(
    page: number = 0,
    size: number = 20,
    sort: string = 'username'
  ): Observable<PageResponse<UserSummaryDTO>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort);

    return this.http.get<PageResponse<UserSummaryDTO>>(this.baseUrl, { params });
  }

  /**
   * Ottiene le statistiche di attività di un utente
   *
   * Endpoint: GET /api/users/{userId}/stats
   * Autenticazione: richiesta
   *
   * Restituisce:
   * - Numero post pubblicati
   * - Numero commenti scritti
   * - Like ricevuti sui propri post
   * - Totale interazioni
   *
   * @param userId ID utente
   */
  getUserStats(userId: number): Observable<UserStats> {
    return this.http.get<UserStats>(`${this.baseUrl}/${userId}/stats`);
  }

  /**
   * Verifica se uno username è disponibile per la registrazione
   *
   * Endpoint: GET /api/users/check/username?username={username}
   * Autenticazione: NON richiesta
   *
   * Utilizzato per validazione real-time durante registrazione
   *
   * @param username username da verificare
   */
  checkUsernameAvailability(username: string): Observable<{ disponibile: boolean }> {
    const params = new HttpParams().set('username', username);
    return this.http.get<{ disponibile: boolean }>(`${this.baseUrl}/check/username`, { params });
  }

  /**
   * Verifica se un'email è disponibile per la registrazione
   *
   * Endpoint: GET /api/users/check/email?email={email}
   * Autenticazione: NON richiesta
   *
   * Utilizzato per validazione real-time durante registrazione
   *
   * @param email email da verificare
   */
  checkEmailAvailability(email: string): Observable<{ disponibile: boolean }> {
    const params = new HttpParams().set('email', email);
    return this.http.get<{ disponibile: boolean }>(`${this.baseUrl}/check/email`, { params });
  }

  /**
   * Ottiene suggerimenti di username per funzionalità di menzioni
   *
   * Endpoint: GET /api/users/suggestions/mentions?prefix={prefix}
   * Autenticazione: richiesta
   *
   * Cerca username che iniziano con il prefisso fornito
   * Limita i risultati a 10 per prestazioni
   * Utilizzato per autocomplete durante scrittura post/commenti
   *
   * @param prefix prefisso username (es: "gio" per cercare "@giovanni")
   */
  getMentionSuggestions(prefix: string): Observable<UserSummaryDTO[]> {
    const params = new HttpParams().set('prefix', prefix);
    return this.http.get<UserSummaryDTO[]>(`${this.baseUrl}/suggestions/mentions`, { params });
  }

  /**
   * Disattiva il proprio account utente (soft delete)
   *
   * Endpoint: DELETE /api/users/me
   * Autenticazione: richiesta
   *
   * L'account viene disattivato ma non eliminato dal database
   * Richiede la password per conferma
   * Non permette la disattivazione di account admin
   *
   * @param request DTO con password per conferma
   */
  deactivateAccount(request: DisattivaAccountRequestDTO): Observable<MessageResponse> {
    return this.http.delete<MessageResponse>(`${this.baseUrl}/me`, { body: request });
  }
}


