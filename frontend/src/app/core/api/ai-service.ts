import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AnalizzaLibroResponseDTO, ChatbotResponseDTO } from '../../models';

export interface ChatbotMessage {
  ruolo: 'user' | 'model';
  testo: string;
}

export interface AnalizzaLibroRequestDTO {
  frontImageUrl: string;
  backImageUrl?: string;
}

export interface ChatbotRequestDTO {
  messaggio: string;
}

@Injectable({
  providedIn: 'root',
})
export class AiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/ai`;

  /**
   * POST /api/ai/analizza-libro
   * Analizza le foto di un libro con Gemini Vision e restituisce i dati
   * pre-compilati (titolo, autore, isbn, prezzo suggerito, condizione, ecc.).
   * Usato nel SellBookModal dopo l'upload delle foto su Cloudinary.
   */
  analizzaLibro(frontImageUrl: string, backImageUrl?: string): Observable<AnalizzaLibroResponseDTO> {
    const body: AnalizzaLibroRequestDTO = { frontImageUrl, ...(backImageUrl ? { backImageUrl } : {}) };
    return this.http.post<AnalizzaLibroResponseDTO>(`${this.baseUrl}/analizza-libro`, body);
  }

  /**
   * POST /api/ai/chatbot
   * Chatbot assistente libreria: risponde in linguaggio naturale
   * con testo + eventuali card libro pertinenti.
   * Il backend riceve tutti i libri disponibili come contesto per Gemini.
   */
  chatbot(messaggio: string): Observable<ChatbotResponseDTO> {
    const body: ChatbotRequestDTO = { messaggio };
    return this.http.post<ChatbotResponseDTO>(`${this.baseUrl}/chatbot`, body);
  }
}
