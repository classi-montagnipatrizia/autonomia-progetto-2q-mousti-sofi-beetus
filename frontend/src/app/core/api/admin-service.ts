import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { PageResponse } from '../../models';
@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/admin`;

  // ============================================================================
  // GESTIONE UTENTI
  // ============================================================================

  /**
   * Ottiene la lista completa degli utenti con informazioni admin
   *
   * Endpoint: GET /api/admin/users
   * Autenticazione: richiesta (ADMIN)
   *
   * Restituisce utenti con campi: id, username, nomeCompleto, email, profilePictureUrl, isAdmin, isActive
   *
   * @param page numero pagina (default 0)
   * @param size elementi per pagina (default 20)
   * @param query query di ricerca opzionale per username o nome
   */
  getAllUsers(
    page: number = 0,
    size: number = 20,
    query?: string
  ): Observable<PageResponse<AdminUserDTO>> {
    let params = new HttpParams().set('page', page.toString()).set('size', size.toString());

    if (query && query.trim()) {
      params = params.set('query', query.trim());
    }

    return this.http.get<PageResponse<AdminUserDTO>>(`${this.baseUrl}/users`, { params });
  }

  /**
   * Elimina completamente un utente dal sistema
   *
   * Endpoint: DELETE /api/admin/users/{userId}
   * Autenticazione: richiesta (ADMIN)
   *
   * @param userId ID dell'utente da eliminare
   */
  deleteUser(userId: number): Observable<MessageResponse> {
    return this.http.delete<MessageResponse>(`${this.baseUrl}/users/${userId}`);
  }

  /**
   * Disattiva l'account di un utente
   *
   * Endpoint: PUT /api/admin/users/{userId}/disable
   * Autenticazione: richiesta (ADMIN)
   *
   * L'utente non potrà più accedere al sistema
   *
   * @param userId ID dell'utente da disattivare
   */
  disableUser(userId: number): Observable<MessageResponse> {
    return this.http.put<MessageResponse>(`${this.baseUrl}/users/${userId}/disable`, {});
  }

  /**
   * Riattiva l'account di un utente precedentemente disattivato
   *
   * Endpoint: PUT /api/admin/users/{userId}/enable
   * Autenticazione: richiesta (ADMIN)
   *
   * @param userId ID dell'utente da riattivare
   */
  enableUser(userId: number): Observable<MessageResponse> {
    return this.http.put<MessageResponse>(`${this.baseUrl}/users/${userId}/enable`, {});
  }

  /**
   * Promuove un utente ad amministratore
   *
   * Endpoint: PUT /api/admin/users/{userId}/promote
   * Autenticazione: richiesta (ADMIN)
   *
   * @param userId ID dell'utente da promuovere
   */
  promoteToAdmin(userId: number): Observable<MessageResponse> {
    return this.http.put<MessageResponse>(`${this.baseUrl}/users/${userId}/promote`, {});
  }

  /**
   * Rimuove i privilegi amministrativi da un utente
   *
   * Endpoint: PUT /api/admin/users/{userId}/demote
   * Autenticazione: richiesta (ADMIN)
   *
   * @param userId ID dell'utente da degradare
   */
  demoteFromAdmin(userId: number): Observable<MessageResponse> {
    return this.http.put<MessageResponse>(`${this.baseUrl}/users/${userId}/demote`, {});
  }

  // ============================================================================
  // MODERAZIONE CONTENUTI
  // ============================================================================

  /**
   * Elimina un post come amministratore
   *
   * Endpoint: DELETE /api/admin/posts/{postId}
   * Autenticazione: richiesta (ADMIN)
   *
   * Utilizzato per moderazione contenuti
   *
   * @param postId ID del post da eliminare
   */
  deletePost(postId: number): Observable<MessageResponse> {
    return this.http.delete<MessageResponse>(`${this.baseUrl}/posts/${postId}`);
  }

  /**
   * Elimina un commento come amministratore
   *
   * Endpoint: DELETE /api/admin/comments/{commentId}
   * Autenticazione: richiesta (ADMIN)
   *
   * Utilizzato per moderazione contenuti
   *
   * @param commentId ID del commento da eliminare
   */
  deleteComment(commentId: number): Observable<MessageResponse> {
    return this.http.delete<MessageResponse>(`${this.baseUrl}/comments/${commentId}`);
  }

  /**
   * Elimina tutti i post di un utente
   *
   * Endpoint: DELETE /api/admin/users/{userId}/posts
   * Autenticazione: richiesta (ADMIN)
   *
   * Azione di moderazione massiva
   * Restituisce il numero di post eliminati
   *
   * @param userId ID dell'utente
   */
  deleteAllUserPosts(userId: number): Observable<DeleteCountResponse> {
    return this.http.delete<DeleteCountResponse>(`${this.baseUrl}/users/${userId}/posts`);
  }

  /**
   * Elimina tutti i commenti di un utente
   *
   * Endpoint: DELETE /api/admin/users/{userId}/comments
   * Autenticazione: richiesta (ADMIN)
   *
   * Azione di moderazione massiva
   * Restituisce il numero di commenti eliminati
   *
   * @param userId ID dell'utente
   */
  deleteAllUserComments(userId: number): Observable<DeleteCountResponse> {
    return this.http.delete<DeleteCountResponse>(`${this.baseUrl}/users/${userId}/comments`);
  }

  // ============================================================================
  // STATISTICHE E MONITORING
  // ============================================================================

  /**
   * Ottiene statistiche generali del sistema
   *
   * Endpoint: GET /api/admin/stats
   * Autenticazione: richiesta (ADMIN)
   *
   * Restituisce informazioni su utenti, post, commenti, like, etc.
   */
  getSystemStats(): Observable<SystemStatsResponse> {
    return this.http.get<SystemStatsResponse>(`${this.baseUrl}/stats`);
  }

  // ============================================================================
  // AUDIT LOG
  // ============================================================================

  /**
   * Ottiene l'audit log completo delle azioni amministrative
   *
   * Endpoint: GET /api/admin/audit-log
   * Autenticazione: richiesta (ADMIN)
   *
   * Log paginato di tutte le azioni amministrative effettuate
   *
   * @param page numero pagina (default 0)
   * @param size elementi per pagina (default 50)
   */
  getAuditLog(page: number = 0, size: number = 50): Observable<PageResponse<AdminAuditLog>> {
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());

    return this.http.get<PageResponse<AdminAuditLog>>(`${this.baseUrl}/audit-log`, { params });
  }

  /**
   * Ottiene l'audit log per un amministratore specifico
   *
   * Endpoint: GET /api/admin/audit-log/admin/{adminId}
   * Autenticazione: richiesta (ADMIN)
   *
   * @param adminId ID dell'amministratore
   * @param page numero pagina (default 0)
   * @param size elementi per pagina (default 50)
   */
  getAuditLogByAdmin(
    adminId: number,
    page: number = 0,
    size: number = 50
  ): Observable<PageResponse<AdminAuditLog>> {
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());

    return this.http.get<PageResponse<AdminAuditLog>>(
      `${this.baseUrl}/audit-log/admin/${adminId}`,
      { params }
    );
  }

  /**
   * Ottiene l'audit log per un tipo di azione specifica
   *
   * Endpoint: GET /api/admin/audit-log/action/{action}
   * Autenticazione: richiesta (ADMIN)
   *
   * @param action tipo di azione (es. DELETE_USER, DISABLE_USER, etc.)
   * @param page numero pagina (default 0)
   * @param size elementi per pagina (default 50)
   */
  getAuditLogByAction(
    action: string,
    page: number = 0,
    size: number = 50
  ): Observable<PageResponse<AdminAuditLog>> {
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());

    return this.http.get<PageResponse<AdminAuditLog>>(
      `${this.baseUrl}/audit-log/action/${action}`,
      { params }
    );
  }

  // ============================================================================
  // PULIZIA DATABASE
  // ============================================================================

  /**
   * Esegue la pulizia del database
   *
   * Endpoint: POST /api/admin/cleanup?giorni={giorni}
   * Autenticazione: richiesta (ADMIN)
   *
   * Elimina dati obsoleti più vecchi del numero di giorni specificato
   * Restituisce il numero di elementi eliminati per tipo
   *
   * @param giorni numero di giorni (default 90)
   */
  cleanupDatabase(giorni: number = 90): Observable<CleanupResponse> {
    const params = new HttpParams().set('giorni', giorni.toString());
    return this.http.post<CleanupResponse>(`${this.baseUrl}/cleanup`, {}, { params });
  }

  // ============================================================================
  // GESTIONE RATE LIMIT
  // ============================================================================

  /**
   * Ottiene statistiche sul rate limiting
   *
   * Endpoint: GET /api/admin/rate-limit/stats
   * Autenticazione: richiesta (ADMIN)
   *
   * Restituisce informazioni sulla cache e utilizzo memoria
   */
  getRateLimitStats(): Observable<RateLimitStatsResponse> {
    return this.http.get<RateLimitStatsResponse>(`${this.baseUrl}/rate-limit/stats`);
  }

  /**
   * Resetta il rate limit per un utente specifico
   *
   * Endpoint: DELETE /api/admin/rate-limit/reset/user/{username}?type={type}
   * Autenticazione: richiesta (ADMIN)
   *
   * Utile per sbloccare utenti che hanno superato il limite per errore
   *
   * @param username username dell'utente
   * @param type tipo di rate limit (AUTH, POST_CREATION, LIKE, MESSAGE, API_GENERAL, WEBSOCKET)
   */
  resetUserRateLimit(username: string, type: RateLimitType): Observable<MessageResponse> {
    const params = new HttpParams().set('type', type);
    return this.http.delete<MessageResponse>(`${this.baseUrl}/rate-limit/reset/user/${username}`, {
      params,
    });
  }

  /**
   * Resetta il rate limit per una chiave IP specifica
   *
   * Endpoint: DELETE /api/admin/rate-limit/reset/ip/{ipSessionKey}?type={type}
   * Autenticazione: richiesta (ADMIN)
   *
   * La chiave deve includere IP e session ID nel formato: ip:192.168.1.1:session:ABC123
   *
   * @param ipSessionKey chiave completa IP (formato: ip:{ip}:session:{sessionId})
   * @param type tipo di rate limit
   */
  resetIpRateLimit(ipSessionKey: string, type: RateLimitType): Observable<MessageResponse> {
    const params = new HttpParams().set('type', type);
    return this.http.delete<MessageResponse>(
      `${this.baseUrl}/rate-limit/reset/ip/${ipSessionKey}`,
      { params }
    );
  }

  /**
   * Ottiene i token rimanenti per un utente specifico
   *
   * Endpoint: GET /api/admin/rate-limit/tokens/user/{username}?type={type}
   * Autenticazione: richiesta (ADMIN)
   *
   * Utile per debugging e monitoring
   *
   * @param username username dell'utente
   * @param type tipo di rate limit da verificare
   */
  getUserRateLimitTokens(username: string, type: RateLimitType): Observable<UserTokensResponse> {
    const params = new HttpParams().set('type', type);
    return this.http.get<UserTokensResponse>(`${this.baseUrl}/rate-limit/tokens/user/${username}`, {
      params,
    });
  }
}

// ============================================================================
// INTERFACCE
// ============================================================================

/**
 * Risposta generica con messaggio
 */
export interface MessageResponse {
  message: string;
}

/**
 * Risposta con conteggio elementi eliminati
 */
export interface DeleteCountResponse {
  message: string;
  deletedCount: number;
}

/**
 * Statistiche di sistema
 */
export interface SystemStatsResponse {
  [key: string]: any; // Struttura dinamica in base alle statistiche disponibili
}

/**
 * Entry dell'audit log amministrativo
 */
export interface AdminAuditLog {
  id: number;
  adminId: number;
  adminUsername: string;
  azione: string;
  targetId?: number;
  targetType?: string;
  dettagli?: string;
  ipAddress: string;
  createdAt: string;
}

/**
 * Risposta pulizia database
 */
export interface CleanupResponse {
  message: string;
  risultati: {
    [key: string]: number; // Conteggi per tipo di elemento eliminato
  };
}

/**
 * Statistiche rate limiting
 */
export interface RateLimitStatsResponse {
  cacheStats: any;
  rateLimitTypes: string[];
  message: string;
}

/**
 * Risposta token utente
 */
export interface UserTokensResponse {
  username: string;
  type: string;
  availableTokens: number;
  limit: string;
}
/**
 * Tipi di rate limit disponibili
 */
export type RateLimitType =
  | 'AUTH'
  | 'POST_CREATION'
  | 'LIKE'
  | 'MESSAGE'
  | 'API_GENERAL'
  | 'WEBSOCKET';

/**
 * DTO utente per pagina admin con informazioni estese
 */
export interface AdminUserDTO {
  id: number;
  username: string;
  nomeCompleto: string;
  email: string;
  profilePictureUrl: string | null;
  isAdmin: boolean;
  isActive: boolean;
}
