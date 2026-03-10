import { inject, Injectable, signal } from '@angular/core';
import { AiChatbotService } from '../api/ai-chatbot-service';
import { LoggerService } from '../services/logger.service';
import { AiChatMessageDTO } from '../../models';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AiChatbotStore {
  private readonly aiService = inject(AiChatbotService);
  private readonly logger = inject(LoggerService);

  // =========================================================================
  // STATE
  // =========================================================================
  private readonly _messages = signal<AiChatMessageDTO[]>([]);
  private readonly _loading = signal<boolean>(false);
  private readonly _sending = signal<boolean>(false);
  private readonly _initialized = signal<boolean>(false);

  // =========================================================================
  // PUBLIC SELECTORS
  // =========================================================================
  readonly messages = this._messages.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly sending = this._sending.asReadonly();
  readonly initialized = this._initialized.asReadonly();

  // =========================================================================
  // ACTIONS
  // =========================================================================

  /**
   * Inizializza la chat caricando il messaggio di benvenuto
   */
  async initialize(): Promise<void> {
    if (this._initialized()) return;
    this._loading.set(true);

    try {
      const welcome = await firstValueFrom(this.aiService.getWelcomeMessage());
      this._messages.set([welcome]);
      this._initialized.set(true);
    } catch (error) {
      this.logger.error('Errore inizializzazione AI chatbot', error);
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Invia un messaggio all'AI
   */
  async sendMessage(contenuto: string): Promise<void> {
    if (this._sending() || !contenuto.trim()) return;

    // Aggiungi il messaggio utente immediatamente
    const userMessage: AiChatMessageDTO = {
      id: Date.now(),
      ruolo: 'user',
      contenuto: contenuto.trim(),
      libriSuggeriti: [],
      errore: false,
      createdAt: new Date().toISOString(),
    };
    this._messages.update((prev) => [...prev, userMessage]);
    this._sending.set(true);

    try {
      const response = await firstValueFrom(this.aiService.sendMessage(contenuto.trim()));
      this._messages.update((prev) => [...prev, response.messaggio]);
    } catch (error) {
      this.logger.error('Errore invio messaggio AI', error);
      // Aggiungi messaggio di errore
      const errorMessage: AiChatMessageDTO = {
        id: Date.now() + 1,
        ruolo: 'assistant',
        contenuto: 'Ops! Qualcosa è andato storto. Non sono riuscito a elaborare la tua richiesta.',
        libriSuggeriti: [],
        errore: true,
        createdAt: new Date().toISOString(),
      };
      this._messages.update((prev) => [...prev, errorMessage]);
    } finally {
      this._sending.set(false);
    }
  }

  /**
   * Riprova l'ultimo messaggio dopo un errore
   */
  async retryLastMessage(): Promise<void> {
    const msgs = this._messages();
    // Trova l'ultimo messaggio di errore
    let errorIndex = -1;
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].errore) { errorIndex = i; break; }
    }
    if (errorIndex < 0) return;

    // Rimuovi il messaggio di errore
    const withoutError = msgs.filter((_, i) => i !== errorIndex);
    this._messages.set(withoutError);

    // Trova l'ultimo messaggio utente
    let lastUserMsg: AiChatMessageDTO | undefined;
    for (let i = withoutError.length - 1; i >= 0; i--) {
      if (withoutError[i].ruolo === 'user') { lastUserMsg = withoutError[i]; break; }
    }
    if (lastUserMsg) {
      // Rimuovi anche l'ultimo messaggio utente perché sendMessage lo ri-aggiunge
      this._messages.set(withoutError.filter((m) => m !== lastUserMsg));
      await this.sendMessage(lastUserMsg.contenuto);
    }
  }

  /**
   * Pulisci la chat e re-inizializza
   */
  clear(): void {
    this._messages.set([]);
    this._initialized.set(false);
    this._sending.set(false);
    this._loading.set(false);
  }
}
