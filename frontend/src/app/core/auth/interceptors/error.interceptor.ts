import { HttpInterceptorFn, HttpErrorResponse, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth-service';
import { TokenService } from '../services/token-service';
import { ToastService } from '../../services/toast-service';
import { OnlineUsersStore } from '../../stores/online-users-store';
import { LoggerService } from '../../services/logger.service';

/**
 * Interceptor per gestire errori HTTP e refresh token automatico
 * 
 * Gestisce:
 * - 400 Bad Request: mostra errori di validazione
 * - 401 Unauthorized: tenta refresh token e riprova la richiesta
 * - 403 Forbidden: mostra messaggio permessi negati
 * - 404 Not Found: mostra risorsa non trovata
 * - 429 Too Many Requests: mostra rate limit
 * - 500+ Server errors: logging e notifica utente
 * - Network errors: mostra errore di connessione
 * 
 * Logica refresh token:
 * 1. Se riceviamo 401 e non è la chiamata di refresh
 * 2. Proviamo a refreshare il token
 * 3. Se il refresh ha successo, riproviamo la richiesta originale
 * 4. Se il refresh fallisce, effettuiamo logout
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const tokenService = inject(TokenService);
  const toastService = inject(ToastService);
  const onlineUsersStore = inject(OnlineUsersStore);
  const logger = inject(LoggerService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Gestisce errori di rete (timeout, no connection)
      if (error.status === 0) {
        return handleNetworkError(error, toastService, logger);
      }

      // Gestisce errori 400 Bad Request
      if (error.status === 400) {
        return handle400Error(error, toastService, logger);
      }

      // Gestisce errori 401 Unauthorized
      if (error.status === 401) {
        return handle401Error(req, next, authService, tokenService, toastService, onlineUsersStore, logger);
      }

      // Gestisce errori 403 Forbidden
      if (error.status === 403) {
        return handle403Error(error, toastService, logger);
      }

      // Gestisce errori 404 Not Found
      if (error.status === 404) {
        return handle404Error(error, toastService, logger);
      }

      // Gestisce errori 429 Too Many Requests
      if (error.status === 429) {
        return handle429Error(error, toastService, logger);
      }

      // Gestisce errori 5xx Server Error
      if (error.status >= 500) {
        return handle5xxError(error, toastService, logger);
      }

      // Per tutti gli altri errori 4xx, mostra toast generico
      if (error.status >= 400 && error.status < 500) {
        return handleGeneric4xxError(error, toastService, logger);
      }

      // Per tutti gli altri errori, propagali senza toast
      return throwError(() => error);
    })
  );
};

/**
 * Gestisce errori di rete (timeout, no connection)
 */
function handleNetworkError(error: HttpErrorResponse, toastService: ToastService, logger: LoggerService) {
  logger.error('Errore di rete', error);

  toastService.error(
    'Impossibile connettersi al server. Verifica la tua connessione internet.',
    { duration: 8000 }
  );

  return throwError(() => new Error('Errore di connessione'));
}

/**
 * Gestisce errore 400 Bad Request
 */
function handle400Error(error: HttpErrorResponse, toastService: ToastService, logger: LoggerService) {
  logger.error('Richiesta non valida', error);

  // Estrae il messaggio di errore dal backend se disponibile
  const errorMessage = extractErrorMessage(error) || 'I dati inseriti non sono validi.';

  toastService.error(errorMessage, { duration: 6000 });

  return throwError(() => error);
}

/**
 * Gestisce errore 401 con tentativo di refresh token
 */
function handle401Error(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  authService: AuthService,
  tokenService: TokenService,
  toastService: ToastService,
  onlineUsersStore: OnlineUsersStore,
  logger: LoggerService
) {
  // Non tentare refresh se siamo già sulla chiamata di refresh, logout o su endpoint pubblici
  if (
    req.url.includes('/auth/refresh-token') ||
    req.url.includes('/auth/login') ||
    req.url.includes('/auth/register') ||
    req.url.includes('/auth/logout')
  ) {
    // Effettua logout locale se refresh token invalido (senza chiamare il backend)
    if (req.url.includes('/auth/refresh-token')) {
      tokenService.clearTokens();
      onlineUsersStore.stopPolling();
      toastService.warning('Sessione scaduta. Effettua nuovamente il login.', { duration: 7000 });
    }
    return throwError(() => new Error('Token non valido'));
  }

  // Tenta il refresh del token silenziosamente
  return authService.refreshToken().pipe(
    switchMap(() => {
      // Refresh riuscito, riprova la richiesta originale con nuovo token
      const token = tokenService.getAccessToken();
      
      const clonedRequest = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });

      return next(clonedRequest);
    }),
    catchError((refreshError) => {
      // Refresh fallito, pulisci i token localmente (senza chiamare il backend per evitare loop)
      tokenService.clearTokens();
      onlineUsersStore.stopPolling();

      logger.error('Errore refresh token', refreshError);
      toastService.warning(
        'La tua sessione è scaduta. Effettua nuovamente il login.',
        { duration: 7000 }
      );

      return throwError(() => new Error('Sessione scaduta'));
    })
  );
}

/**
 * Gestisce errore 403 Forbidden
 */
function handle403Error(error: HttpErrorResponse, toastService: ToastService, logger: LoggerService) {
  logger.error('Accesso negato', error);

  const errorMessage = extractErrorMessage(error) || 'Non hai i permessi per eseguire questa operazione.';

  toastService.error(errorMessage, { duration: 6000 });

  return throwError(() => error);
}

/**
 * Gestisce errore 404 Not Found
 */
function handle404Error(error: HttpErrorResponse, toastService: ToastService, logger: LoggerService) {
  logger.error('Risorsa non trovata', error);

  // Mostra toast solo per endpoint API, non per assets/immagini
  if (error.url && error.url.includes('/api/')) {
    const errorMessage = extractErrorMessage(error) || 'La risorsa richiesta non è stata trovata.';
    toastService.warning(errorMessage, { duration: 5000 });
  }

  return throwError(() => error);
}

/**
 * Gestisce errore 429 Too Many Requests (Rate Limit)
 */
function handle429Error(error: HttpErrorResponse, toastService: ToastService, logger: LoggerService) {
  logger.error('Rate limit superato', error);

  const errorMessage = extractErrorMessage(error) ||
    'Hai effettuato troppe richieste. Riprova tra qualche istante.';

  toastService.warning(errorMessage, { duration: 7000 });

  return throwError(() => error);
}

/**
 * Gestisce errori 5xx Server Error
 */
function handle5xxError(error: HttpErrorResponse, toastService: ToastService, logger: LoggerService) {
  logger.error('Errore server', error);

  const errorMessage = extractErrorMessage(error) ||
    'Si è verificato un errore del server. Riprova più tardi.';

  toastService.error(errorMessage, { duration: 7000 });

  return throwError(() => error);
}

/**
 * Gestisce altri errori 4xx generici
 */
function handleGeneric4xxError(error: HttpErrorResponse, toastService: ToastService, logger: LoggerService) {
  logger.error(`Errore ${error.status}`, error);

  const errorMessage = extractErrorMessage(error) ||
    'Si è verificato un errore durante l\'elaborazione della richiesta.';

  toastService.error(errorMessage, { duration: 6000 });

  return throwError(() => error);
}

/**
 * Estrae il messaggio di errore dal backend
 * Supporta diversi formati di risposta:
 * - { message: "..." }
 * - { error: "..." }
 * - { errors: [...] }
 * - { message: "...", details: "..." }
 */
function extractErrorMessage(error: HttpErrorResponse): string | null {
  if (!error.error) {
    return null;
  }

  // Formato standard: { message: "..." }
  if (typeof error.error.message === 'string') {
    return error.error.message;
  }

  // Formato alternativo: { error: "..." }
  if (typeof error.error.error === 'string') {
    return error.error.error;
  }

  // Array di errori: { errors: ["error1", "error2"] }
  if (Array.isArray(error.error.errors) && error.error.errors.length > 0) {
    return error.error.errors[0];
  }

  // Dettagli aggiuntivi: { message: "...", details: "..." }
  if (error.error.details && typeof error.error.details === 'string') {
    return error.error.details;
  }

  // Se error.error è una stringa diretta
  if (typeof error.error === 'string') {
    return error.error;
  }

  return null;
}