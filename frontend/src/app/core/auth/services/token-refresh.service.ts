import { Injectable, inject, effect } from '@angular/core';
import { AuthStore } from '../../stores/auth-store';
import { TokenService } from './token-service';
import { AuthService } from './auth-service';
import { LoggerService } from '../../services/logger.service';

/**
 * Servizio per la gestione automatica del refresh token.
 *
 * Strategia:
 * - Monitora l'autenticazione dell'utente
 * - Quando l'utente è autenticato, avvia un timer
 * - Rinfresca il token 5 minuti prima della scadenza (25 minuti dal login per token da 30 minuti)
 * - Gestisce automaticamente il cleanup quando l'utente si disconnette
 */
@Injectable({
  providedIn: 'root'
})
export class TokenRefreshService {
  private readonly authStore = inject(AuthStore);
  private readonly tokenService = inject(TokenService);
  private readonly authService = inject(AuthService);
  private readonly logger = inject(LoggerService);

  private refreshTimerId: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // Effect che monitora lo stato di autenticazione
    effect(() => {
      const isAuthenticated = this.authStore.isAuthenticated();

      if (isAuthenticated) {
        // Utente autenticato: avvia il refresh automatico
        this.scheduleTokenRefresh();
      } else {
        // Utente non autenticato: ferma il refresh
        this.stopTokenRefresh();
      }
    });
  }

  /**
   * Pianifica il prossimo refresh del token.
   *
   * Il refresh viene eseguito 5 minuti (300 secondi) prima della scadenza
   * per garantire che l'utente non perda mai la sessione.
   */
  private scheduleTokenRefresh(): void {
    // Pulisce eventuali timer precedenti
    this.stopTokenRefresh();

    const expirationTime = this.tokenService.getTokenExpirationTime();

    if (!expirationTime) {
      this.logger.warn('Impossibile ottenere il tempo di scadenza del token');
      return;
    }

    // Rinfresca 5 minuti (300 secondi) prima della scadenza
    const REFRESH_MARGIN_SECONDS = 300;
    const refreshInSeconds = Math.max(expirationTime - REFRESH_MARGIN_SECONDS, 10);

    // Se il token scade tra meno di 10 secondi, rinfresca immediatamente
    if (refreshInSeconds <= 10) {
      this.performRefresh();
      return;
    }

    // Imposta il timer per il refresh
    this.refreshTimerId = setTimeout(() => {
      this.performRefresh();
    }, refreshInSeconds * 1000);
  }

  /**
   * Esegue il refresh del token e ripianifica il prossimo
   */
  private performRefresh(): void {
    this.authService.refreshToken().subscribe({
      next: () => {
        // Ripianifica il prossimo refresh con il nuovo token
        this.scheduleTokenRefresh();
      },
      error: (error) => {
        this.logger.error('Errore durante il refresh automatico del token', error);
        // L'error interceptor gestirà il logout
      }
    });
  }

  /**
   * Ferma il refresh automatico (chiamato al logout)
   */
  private stopTokenRefresh(): void {
    if (this.refreshTimerId) {
      clearTimeout(this.refreshTimerId);
      this.refreshTimerId = null;
    }
  }
}
