import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AiChatbotService } from '../api/ai-chatbot-service';
import { LoggerService } from '../services/logger.service';
import { BookSummaryDTO } from '../../models';

/**
 * Messaggio nella chat AI (locale al frontend — non è un DTO backend).
 */
export interface ChatMessage {
  id: number;
  ruolo: 'user' | 'assistant';
  contenuto: string;
  libriSuggeriti: BookSummaryDTO[];
  errore: boolean;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class AiChatbotStore {
  private readonly aiService = inject(AiChatbotService);
  private readonly logger = inject(LoggerService);

  // ============================================================================
  // SIGNALS PRIVATI
  // ============================================================================

  private readonly _messages = signal<ChatMessage[]>([]);
  private readonly _loading = signal(false);
  private readonly _sending = signal(false);
  private readonly _initialized = signal(false);

  // ============================================================================
  // SIGNALS PUBBLICI READONLY
  // ============================================================================

  readonly messages = this._messages.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly sending = this._sending.asReadonly();
  readonly initialized = this._initialized.asReadonly();

  // ============================================================================
  // AZIONI
  // ============================================================================

  /**
   * Carica il messaggio di benvenuto statico. Idempotente.
   */
  async initialize(): Promise<void> {
    if (this._initialized()) return;
    this._loading.set(true);
    try {
      const testo = await firstValueFrom(this.aiService.getWelcomeMessage());
      const welcome: ChatMessage = {
        id: 0,
        ruolo: 'assistant',
        contenuto: testo,
        libriSuggeriti: [],
        errore: false,
        createdAt: new Date().toISOString(),
      };
      this._messages.set([welcome]);
      this._initialized.set(true);
    } catch (error) {
      this.logger.error('Errore inizializzazione AI chatbot', error);
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Invia un messaggio all'AI. Aggiunge il messaggio utente ottimisticamente,
   * poi aggiunge la risposta del chatbot con gli eventuali libri suggeriti.
   */
  async sendMessage(contenuto: string): Promise<void> {
    if (this._sending() || !contenuto.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now(),
      ruolo: 'user',
      contenuto: contenuto.trim(),
      libriSuggeriti: [],
      errore: false,
      createdAt: new Date().toISOString(),
    };
    this._messages.update(prev => [...prev, userMsg]);
    this._sending.set(true);

    try {
      const response = await firstValueFrom(this.aiService.sendMessage(contenuto.trim()));
      const aiMsg: ChatMessage = {
        id: Date.now() + 1,
        ruolo: 'assistant',
        contenuto: response.risposta,
        libriSuggeriti: response.libri ?? [],
        errore: false,
        createdAt: new Date().toISOString(),
      };
      this._messages.update(prev => [...prev, aiMsg]);
    } catch (error) {
      this.logger.error('Errore risposta AI chatbot', error);
      const errMsg: ChatMessage = {
        id: Date.now() + 1,
        ruolo: 'assistant',
        contenuto: 'Ops! Qualcosa è andato storto. Riprova tra qualche secondo.',
        libriSuggeriti: [],
        errore: true,
        createdAt: new Date().toISOString(),
      };
      this._messages.update(prev => [...prev, errMsg]);
    } finally {
      this._sending.set(false);
    }
  }

  /**
   * Rimuove l'ultimo messaggio di errore e re-invia l'ultimo messaggio utente.
   * Un solo set() per evitare flicker tra il remove e il re-send.
   */
  async retryLastMessage(): Promise<void> {
    const msgs = this._messages();
    let lastErrorIdx = -1;
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].errore) { lastErrorIdx = i; break; }
    }
    if (lastErrorIdx < 0) return;

    let lastUserIdx = -1;
    for (let i = lastErrorIdx - 1; i >= 0; i--) {
      if (msgs[i].ruolo === 'user') { lastUserIdx = i; break; }
    }
    if (lastUserIdx < 0) return;

    const lastUserContent = msgs[lastUserIdx].contenuto;
    this._messages.set(
      msgs.filter((_, i) => i !== lastErrorIdx && i !== lastUserIdx)
    );
    await this.sendMessage(lastUserContent);
  }

  /**
   * Azzera la chat e permette una nuova inizializzazione.
   */
  clear(): void {
    this._messages.set([]);
    this._initialized.set(false);
    this._sending.set(false);
    this._loading.set(false);
  }
}
