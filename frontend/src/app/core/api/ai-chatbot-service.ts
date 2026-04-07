import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { AiService } from './ai-service';
import { ChatbotResponseDTO } from '../../models';

const WELCOME_TEXT =
  'Ciao! Sono l\'assistente della Libreria BeetUS. Posso aiutarti a trovare libri scolastici usati.\n\nProva a chiedermi:\n• "Cerco un libro di matematica per il terzo anno"\n• "Hai libri di inglese sotto i 15 euro?"\n• "Mi serve il libro di storia del secondo anno"';

@Injectable({
  providedIn: 'root',
})
export class AiChatbotService {
  private readonly aiService = inject(AiService);

  /**
   * Restituisce il messaggio di benvenuto statico (nessun endpoint backend).
   */
  getWelcomeMessage(): Observable<string> {
    return of(WELCOME_TEXT);
  }

  /**
   * Invia un messaggio al chatbot AI e ottieni la risposta con libri suggeriti.
   */
  sendMessage(messaggio: string): Observable<ChatbotResponseDTO> {
    return this.aiService.chatbot(messaggio);
  }
}
