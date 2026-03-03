import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Observable, of, delay } from 'rxjs';
import {
  AiChatMessageDTO,
  AiChatResponseDTO,
  AiSuggestedBookDTO,
  BookCondition,
} from '../../models';

// ============================================================================
// DATI MOCK (da rimuovere quando l'API sarà pronta)
// ============================================================================

const MOCK_SUGGESTED_BOOKS: AiSuggestedBookDTO[] = [
  {
    listingId: 1,
    titolo: 'Matematica Blu 2.0 - Vol. 3',
    autore: 'Bergamini, Barozzi',
    prezzo: 15,
    condizione: BookCondition.COME_NUOVO,
    imageUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=100',
  },
  {
    listingId: 2,
    titolo: 'Colori della Matematica - Vol. 3',
    autore: 'Sasso',
    prezzo: 12,
    condizione: BookCondition.BUONE_CONDIZIONI,
    imageUrl: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=100',
  },
];

const MOCK_WELCOME_MESSAGE: AiChatMessageDTO = {
  id: 0,
  ruolo: 'assistant',
  contenuto:
    'Ciao! Sono l\'assistente della Libreria. Posso aiutarti a trovare libri scolastici usati.\n\nProva a chiedermi:\n• "Cerco un libro di matematica per il terzo anno"\n• "Hai libri di inglese sotto i 15 euro?"\n• "Mi serve il libro di storia del secondo anno"',
  libriSuggeriti: [],
  errore: false,
  createdAt: new Date().toISOString(),
};

let mockIdCounter = 10;

function createMockResponse(userMessage: string): AiChatMessageDTO {
  const lower = userMessage.toLowerCase();

  // Simula risposta con risultati
  if (lower.includes('matematica') || lower.includes('math')) {
    return {
      id: ++mockIdCounter,
      ruolo: 'assistant',
      contenuto: 'Ho trovato **2 libri** di matematica per il 3° anno:',
      libriSuggeriti: MOCK_SUGGESTED_BOOKS,
      errore: false,
      createdAt: new Date().toISOString(),
    };
  }

  // Simula risposta senza risultati
  if (lower.includes('chimica') || lower.includes('arte')) {
    return {
      id: ++mockIdCounter,
      ruolo: 'assistant',
      contenuto:
        'Mi dispiace, non ho trovato libri corrispondenti alla tua ricerca al momento.\n\nProva a cercare con criteri diversi oppure controlla più tardi — nuovi libri vengono aggiunti ogni giorno!',
      libriSuggeriti: [],
      errore: false,
      createdAt: new Date().toISOString(),
    };
  }

  // Simula info su un libro specifico
  if (lower.includes('info') || lower.includes('primo') || lower.includes('dettagli')) {
    return {
      id: ++mockIdCounter,
      ruolo: 'assistant',
      contenuto:
        'Ecco i dettagli su **Matematica Blu 2.0 - Vol. 3**:\n\n📚 Autore: Bergamini, Barozzi, Trifone\n💰 Prezzo: €15\n✨ Condizione: Come nuovo\n📖 Anno: 3°\n\nIl libro è in ottime condizioni, usato per un solo anno scolastico. Nessuna sottolineatura o appunti. Vuoi contattare il venditore?',
      libriSuggeriti: [MOCK_SUGGESTED_BOOKS[0]],
      errore: false,
      createdAt: new Date().toISOString(),
    };
  }

  // Risposta generica
  return {
    id: ++mockIdCounter,
    ruolo: 'assistant',
    contenuto:
      'Posso aiutarti a cercare libri scolastici! Dimmi la materia, l\'anno o il titolo che stai cercando e troverò le migliori opzioni disponibili.',
    libriSuggeriti: [],
    errore: false,
    createdAt: new Date().toISOString(),
  };
}

// ============================================================================
// SERVICE
// ============================================================================

@Injectable({
  providedIn: 'root',
})
export class AiChatbotService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/library/ai-chat`;

  /**
   * Ottieni il messaggio di benvenuto
   */
  getWelcomeMessage(): Observable<AiChatMessageDTO> {
    return of(MOCK_WELCOME_MESSAGE).pipe(delay(300));

    // TODO: API reale
    // return this.http.get<AiChatMessageDTO>(`${this.baseUrl}/welcome`);
  }

  /**
   * Invia un messaggio all'AI e ottieni la risposta
   */
  sendMessage(messaggio: string): Observable<AiChatResponseDTO> {
    const response = createMockResponse(messaggio);
    return of({ messaggio: response }).pipe(delay(1200));

    // TODO: API reale
    // return this.http.post<AiChatResponseDTO>(this.baseUrl, { messaggio });
  }
}
