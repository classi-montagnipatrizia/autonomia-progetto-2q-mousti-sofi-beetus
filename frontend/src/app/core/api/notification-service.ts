import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { NotificationResponseDTO, PageResponse } from '../../models';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/notifications`;

  /**
   * Ottiene tutte le notifiche dell'utente in formato paginato
   *
   * Endpoint: GET /api/notifications
   * Autenticazione: richiesta
   *
   * Le notifiche sono ordinate dalla più recente alla più vecchia
   * Include sia notifiche lette che non lette
   *
   * @param page numero pagina (default 0)
   * @param size elementi per pagina (default 20)
   */
  getNotifications(
    page: number = 0,
    size: number = 20
  ): Observable<PageResponse<NotificationResponseDTO>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<PageResponse<NotificationResponseDTO>>(this.baseUrl, { params });
  }

  /**
   * Ottiene solo le notifiche non ancora lette
   *
   * Endpoint: GET /api/notifications/unread
   * Autenticazione: richiesta
   *
   * Restituisce tutte le notifiche con isRead = false
   */
  getUnreadNotifications(): Observable<NotificationResponseDTO[]> {
    return this.http.get<NotificationResponseDTO[]>(`${this.baseUrl}/unread`);
  }

  /**
   * Ottiene le ultime N notifiche dell'utente
   *
   * Endpoint: GET /api/notifications/recent?limit={limit}
   * Autenticazione: richiesta
   *
   * Progettato per popolare il dropdown delle notifiche nell'header
   * senza caricare tutte le notifiche dell'utente
   *
   * @param limit numero massimo di notifiche da restituire (default 10)
   */
  getRecentNotifications(limit: number = 10): Observable<NotificationResponseDTO[]> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<NotificationResponseDTO[]>(`${this.baseUrl}/recent`, { params });
  }

  /**
   * Conta il numero di notifiche non lette dell'utente
   *
   * Endpoint: GET /api/notifications/count
   * Autenticazione: richiesta
   *
   * Utilizzato per mostrare il badge con il numero di notifiche non lette
   */
  getUnreadCount(): Observable<UnreadCountResponse> {
    return this.http.get<UnreadCountResponse>(`${this.baseUrl}/count`);
  }

  /**
   * Marca una singola notifica come letta
   *
   * Endpoint: PUT /api/notifications/{notificationId}/read
   * Autenticazione: richiesta
   *
   * Viene chiamato quando l'utente clicca su una notifica per visualizzarla
   * Verifica automaticamente che la notifica appartenga all'utente autenticato
   *
   * @param notificationId ID della notifica da marcare come letta
   */
  markAsRead(notificationId: number): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${notificationId}/read`, {});
  }

  /**
   * Marca tutte le notifiche dell'utente come lette
   *
   * Endpoint: PUT /api/notifications/read-all
   * Autenticazione: richiesta
   *
   * Funzionalità "Segna tutte come lette" che azzera il contatore
   * delle notifiche non lette senza doverle eliminare
   */
  markAllAsRead(): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/read-all`, {});
  }

  /**
   * Elimina una singola notifica
   *
   * Endpoint: DELETE /api/notifications/{notificationId}
   * Autenticazione: richiesta
   *
   * L'utente può eliminare le proprie notifiche per fare pulizia
   * Verifica automaticamente che la notifica appartenga all'utente autenticato
   * Restituisce 204 No Content
   *
   * @param notificationId ID della notifica da eliminare
   */
  deleteNotification(notificationId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${notificationId}`);
  }

  /**
   * Elimina tutte le notifiche già lette dell'utente
   *
   * Endpoint: DELETE /api/notifications/read
   * Autenticazione: richiesta
   *
   * Funzionalità di pulizia che mantiene solo le notifiche non lette
   * Utile per fare ordine senza perdere le notifiche non ancora visualizzate
   * Restituisce il numero di notifiche eliminate
   */
  deleteReadNotifications(): Observable<DeleteReadNotificationsResponse> {
    return this.http.delete<DeleteReadNotificationsResponse>(`${this.baseUrl}/read`);
  }

  /**
   * Elimina TUTTE le notifiche dell'utente (lette e non lette)
   *
   * Endpoint: DELETE /api/notifications/all
   * Autenticazione: richiesta
   *
   * Funzionalità di pulizia totale delle notifiche
   * Restituisce il numero di notifiche eliminate
   */
  deleteAllNotifications(): Observable<DeleteReadNotificationsResponse> {
    return this.http.delete<DeleteReadNotificationsResponse>(`${this.baseUrl}/all`);
  }
}

/**
 * Risposta conteggio notifiche non lette
 */
export interface UnreadCountResponse {
  /** Numero di notifiche non lette */
  unreadCount: number;
}

/**
 * Risposta eliminazione notifiche lette
 */
export interface DeleteReadNotificationsResponse {
  /** Numero di notifiche eliminate */
  deletedCount: number;
}
