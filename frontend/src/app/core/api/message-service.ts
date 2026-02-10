import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import {
  InviaMessaggioRequestDTO,
  MessageResponseDTO,
  ConversationResponseDTO,
  PageResponse,
} from '../../models';

@Injectable({
  providedIn: 'root',
})
export class MessageService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/messages`;

  /**
   * Invia un nuovo messaggio diretto a un utente
   *
   * Endpoint: POST /api/messages
   * Autenticazione: richiesta
   *
   * Il destinatario riceverà una notifica del nuovo messaggio
   * Non è possibile inviare messaggi a se stessi
   *
   * @param request DTO con ID destinatario e contenuto
   */
  sendMessage(request: InviaMessaggioRequestDTO): Observable<MessageResponseDTO> {
    return this.http.post<MessageResponseDTO>(this.baseUrl, request);
  }

  /**
   * Ottiene tutte le conversazioni attive con preview ultimo messaggio
   *
   * Endpoint: GET /api/messages/conversations
   * Autenticazione: richiesta
   *
   * Restituisce conversazioni ordinate per data ultimo messaggio (più recenti prime)
   * Include per ogni conversazione:
   * - Dati dell'altro utente
   * - Ultimo messaggio come preview
   * - Numero messaggi non letti
   *
   * @param page numero pagina (default 0)
   * @param size elementi per pagina (default 20)
   */
  getConversations(
    page: number = 0,
    size: number = 20
  ): Observable<PageResponse<ConversationResponseDTO>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<PageResponse<ConversationResponseDTO>>(
      `${this.baseUrl}/conversations`,
      { params }
    );
  }

  /**
   * Ottiene la cronologia completa di una conversazione con un utente
   *
   * Endpoint: GET /api/messages/conversation/{userId}
   * Autenticazione: richiesta
   *
   * Restituisce tutti i messaggi scambiati ordinati cronologicamente
   * Include sia messaggi inviati che ricevuti
   *
   * @param userId ID dell'altro utente nella conversazione
   */
  getConversation(userId: number): Observable<MessageResponseDTO[]> {
    return this.http.get<MessageResponseDTO[]>(`${this.baseUrl}/conversation/${userId}`);
  }

  /**
   * Marca tutti i messaggi di una conversazione come letti
   *
   * Endpoint: PUT /api/messages/conversation/{userId}/read
   * Autenticazione: richiesta
   *
   * Viene chiamato quando l'utente apre/visualizza una conversazione
   * Aggiorna lo stato isRead di tutti i messaggi ricevuti da quell'utente
   *
   * @param userId ID dell'utente mittente dei messaggi
   */
  markConversationAsRead(userId: number): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/conversation/${userId}/read`, {});
  }

  /**
   * Conta tutti i messaggi non letti dell'utente
   *
   * Endpoint: GET /api/messages/unread/count
   * Autenticazione: richiesta
   *
   * Restituisce il numero totale di messaggi ricevuti non ancora letti
   * Utilizzato per badge/notifiche globali
   */
  getUnreadCount(): Observable<UnreadCountResponse> {
    return this.http.get<UnreadCountResponse>(`${this.baseUrl}/unread/count`);
  }

  /**
   * Conta i messaggi non letti da un utente specifico
   *
   * Endpoint: GET /api/messages/conversation/{userId}/unread/count
   * Autenticazione: richiesta
   *
   * Restituisce quanti messaggi non letti provengono dall'utente specificato
   * Utile per mostrare badge specifico per ogni conversazione
   *
   * @param userId ID dell'utente mittente
   */
  getConversationUnreadCount(userId: number): Observable<UnreadCountResponse> {
    return this.http.get<UnreadCountResponse>(
      `${this.baseUrl}/conversation/${userId}/unread/count`
    );
  }

  /**
   * Elimina un singolo messaggio (soft delete)
   *
   * Endpoint: DELETE /api/messages/{messageId}
   * Autenticazione: richiesta
   *
   * Il messaggio viene eliminato solo per l'utente corrente
   * L'altro utente continuerà a visualizzarlo
   * Solo quando entrambi lo eliminano viene rimosso dal database
   * Restituisce 204 No Content
   *
   * @param messageId ID del messaggio da eliminare
   */
  deleteMessage(messageId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${messageId}`);
  }

  /**
   * Elimina un'intera conversazione con un utente
   *
   * Endpoint: DELETE /api/messages/conversation/{userId}
   * Autenticazione: richiesta
   *
   * Elimina tutti i messaggi scambiati con l'utente specificato
   * Applica la stessa logica di soft delete dei singoli messaggi
   * I messaggi rimangono visibili all'altro utente
   * Restituisce il numero di messaggi eliminati
   *
   * @param userId ID dell'altro utente nella conversazione
   */
  deleteConversation(userId: number): Observable<DeleteConversationResponse> {
    return this.http.delete<DeleteConversationResponse>(`${this.baseUrl}/conversation/${userId}`);
  }

  /**
   * Cerca messaggi per contenuto testuale
   *
   * Endpoint: GET /api/messages/search?q={searchTerm}
   * Autenticazione: richiesta
   *
   * Cerca in tutte le conversazioni dell'utente
   * Ricerca case-insensitive con corrispondenze parziali
   *
   * @param searchTerm termine di ricerca
   */
  searchMessages(searchTerm: string): Observable<MessageResponseDTO[]> {
    const params = new HttpParams().set('q', searchTerm);
    return this.http.get<MessageResponseDTO[]>(`${this.baseUrl}/search`, { params });
  }

  /**
   * Segnala che l'utente sta scrivendo a un altro utente
   *
   * Endpoint: POST /api/messages/typing/{userId}
   * Autenticazione: richiesta
   *
   * Il typing indicator scade dopo 3 secondi,
   * chiamare ripetutamente mentre si digita
   *
   * @param userId ID del destinatario
   */
  setTyping(userId: number): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/typing/${userId}`, {});
  }

  /**
   * Rimuove l'indicatore di typing
   *
   * Endpoint: DELETE /api/messages/typing/{userId}
   * Autenticazione: richiesta
   *
   * @param userId ID del destinatario
   */
  clearTyping(userId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/typing/${userId}`);
  }

  /**
   * Verifica se un utente sta scrivendo
   *
   * Endpoint: GET /api/messages/typing/{userId}
   * Autenticazione: richiesta
   *
   * @param userId ID dell'utente da controllare
   */
  isTyping(userId: number): Observable<TypingResponse> {
    return this.http.get<TypingResponse>(`${this.baseUrl}/typing/${userId}`);
  }
}

/**
 * Risposta conteggio messaggi non letti
 */
export interface UnreadCountResponse {
  /** Numero di messaggi non letti */
  unreadCount: number;
}

/**
 * Risposta eliminazione conversazione
 */
export interface DeleteConversationResponse {
  /** Numero di messaggi eliminati */
  deletedCount: number;
}

/**
 * Risposta typing indicator
 */
export interface TypingResponse {
  /** Se l'utente sta scrivendo */
  isTyping: boolean;
}
