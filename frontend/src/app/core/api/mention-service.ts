import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { MentionResponseDTO } from '../../models';

@Injectable({
  providedIn: 'root',
})
export class MentionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/mentions`;

  /**
   * Ottiene tutte le menzioni ricevute dall'utente
   *
   * Endpoint: GET /api/mentions
   * Autenticazione: richiesta
   *
   * Le menzioni sono ordinate dalla più recente alla più vecchia
   * Include menzioni da post e commenti
   */
  getMentions(): Observable<MentionResponseDTO[]> {
    return this.http.get<MentionResponseDTO[]>(this.baseUrl);
  }

  /**
   * Ottiene le ultime N menzioni ricevute dall'utente
   *
   * Endpoint: GET /api/mentions/recent?limit={limit}
   * Autenticazione: richiesta
   *
   * Utile per mostrare un'anteprima delle menzioni recenti
   * senza caricare l'intera lista
   *
   * @param limit numero massimo di menzioni da restituire (default 10)
   */
  getRecentMentions(limit: number = 10): Observable<MentionResponseDTO[]> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<MentionResponseDTO[]>(`${this.baseUrl}/recent`, { params });
  }

  /**
   * Conta il numero totale di menzioni ricevute dall'utente
   *
   * Endpoint: GET /api/mentions/count
   * Autenticazione: richiesta
   *
   * Utile per mostrare statistiche o badge numerici
   */
  getMentionsCount(): Observable<MentionCountResponse> {
    return this.http.get<MentionCountResponse>(`${this.baseUrl}/count`);
  }
}

/**
 * Risposta conteggio menzioni
 */
export interface MentionCountResponse {
  /** Numero totale di menzioni ricevute */
  count: number;
}
