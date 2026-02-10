import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, throwError, firstValueFrom } from 'rxjs';
import { tap, catchError, shareReplay } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import {
  LoginRequestDTO,
  LoginResponseDTO,
  PasswordResetConfirmDTO,
  PasswordResetRequestDTO,
  RefreshTokenRequestDTO,
  RefreshTokenResponseDTO,
  RegistrazioneRequestDTO,
  UserResponseDTO,
} from '../../../models';
import { TokenService } from './token-service';
import { AuthStore } from '../../stores/auth-store';
import { WebsocketService } from '../../services/websocket-service';
import { LoggerService } from '../../services/logger.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly tokenService = inject(TokenService);
  private readonly authStore = inject(AuthStore);
  private readonly websocketService = inject(WebsocketService);
  private readonly logger = inject(LoggerService);

  private readonly API_URL = `${environment.apiUrl}/auth`;

  // Observable condiviso per il refresh token (evita richieste multiple)
  private refreshTokenRequest$: Observable<RefreshTokenResponseDTO> | null = null;

  /**
   * Registrazione nuovo utente
   * Non salva i token perché l'utente deve prima verificare l'email
   */
  register(data: RegistrazioneRequestDTO): Observable<LoginResponseDTO> {
    return this.http.post<LoginResponseDTO>(`${this.API_URL}/register`, data).pipe(
      // Non chiamiamo handleAuthSuccess perché il backend non restituisce token
      // L'utente deve verificare l'email prima di poter accedere
      catchError((error) => this.handleAuthError(error))
    );
  }

  /**
   * Login utente esistente
   */
  login(credentials: LoginRequestDTO): Observable<LoginResponseDTO> {
    return this.http.post<LoginResponseDTO>(`${this.API_URL}/login`, credentials).pipe(
      tap((response) => this.handleAuthSuccess(response)),
      catchError((error) => this.handleAuthError(error))
    );
  }

  /**
   * Logout utente corrente
   * Prima pulisce i token localmente, poi notifica il backend
   */
  logout(): Observable<void> {
    // Pulisci prima i token localmente per evitare problemi di 401 sulla chiamata di logout
    const refreshToken = this.tokenService.getRefreshToken();
    this.handleLogoutSuccess();
    
    // Se non c'è refresh token, non c'è bisogno di chiamare il backend
    if (!refreshToken) {
      return new Observable<void>(observer => {
        observer.next();
        observer.complete();
      });
    }
    
    // Notifica il backend (con il token già salvato prima di pulirlo)
    return this.http.post<void>(`${this.API_URL}/logout`, { refreshToken }).pipe(
      catchError(() => {
        // Ignora errori dal backend, il logout locale è già stato fatto
        return new Observable<void>(observer => {
          observer.next();
          observer.complete();
        });
      })
    );
  }

  /**
   * Refresh del token JWT quando scade
   * Usa shareReplay per evitare richieste multiple simultanee
   */
  refreshToken(): Observable<RefreshTokenResponseDTO> {
    // Se c'è già un refresh in corso, restituisci l'Observable condiviso
    if (this.refreshTokenRequest$) {
      return this.refreshTokenRequest$;
    }

    const refreshToken = this.tokenService.getRefreshToken();

    if (!refreshToken) {
      this.handleLogoutSuccess();
      return throwError(() => new Error('No refresh token available'));
    }

    const request: RefreshTokenRequestDTO = { refreshToken };

    // Crea l'Observable condiviso che cachea il risultato
    this.refreshTokenRequest$ = this.http
      .post<RefreshTokenResponseDTO>(`${this.API_URL}/refresh-token`, request)
      .pipe(
        tap((response) => {
          // Salva i nuovi token
          this.tokenService.saveTokens(response.accessToken, response.refreshToken);

          // Pulisce l'Observable condiviso
          this.refreshTokenRequest$ = null;
        }),
        catchError((error) => {
          // Pulisce l'Observable condiviso
          this.refreshTokenRequest$ = null;

          // Logout in caso di errore
          this.handleLogoutSuccess();

          return throwError(() => error);
        }),
        // shareReplay(1) cachea l'ultimo valore per subscribers multipli
        shareReplay(1)
      );

    return this.refreshTokenRequest$;
  }

  /**
   * Step 1: Richiedi reset password via email
   */
  requestPasswordReset(email: string): Observable<{ message: string }> {
    const request: PasswordResetRequestDTO = { email };
    return this.http.post<{ message: string }>(`${this.API_URL}/reset-password`, request);
  }

  /**
   * Step 2: Valida il token di reset password
   */
  validateResetToken(token: string): Observable<{ valid: boolean }> {
    return this.http.get<{ valid: boolean }>(`${this.API_URL}/validate-reset-token`, {
      params: { token },
    });
  }

  /**
   * Step 3: Conferma reset password con token ricevuto via email
   */
  confirmPasswordReset(token: string, newPassword: string): Observable<{ message: string }> {
    const request: PasswordResetConfirmDTO = { token, newPassword };
    return this.http.post<{ message: string }>(`${this.API_URL}/confirm-reset-password`, request);
  }

  /**
   * Verifica se l'utente è autenticato
   */
  isAuthenticated(): boolean {
    return this.authStore.isAuthenticated();
  }

  /**
   * Ottiene l'utente corrente dallo store
   */
  getCurrentUser(): UserResponseDTO | null {
    return this.authStore.currentUser();
  }

  /**
   * Verifica se l'utente corrente è admin
   */
  isAdmin(): boolean {
    const user = this.getCurrentUser();
    return user?.isAdmin ?? false;
  }

  /**
   * Verifica l'email dell'utente con il token ricevuto via email
   */
  verifyEmail(token: string): Observable<{ message: string }> {
    return this.http.get<{ message: string }>(`${this.API_URL}/verify-email`, {
      params: { token }
    }).pipe(
      catchError((error) => this.handleAuthError(error))
    );
  }

  /**
   * Reinvia l'email di verifica
   */
  resendVerificationEmail(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.API_URL}/resend-verification`, {
      email
    }).pipe(
      catchError((error) => this.handleAuthError(error))
    );
  }

  /**
   * Inizializza l'autenticazione al caricamento dell'app
   * Verifica se ci sono token salvati e se sono validi
   * Se l'access token è scaduto ma il refresh token è presente, tenta il refresh automatico
   */
  async initAuth(): Promise<void> {
    const accessToken = this.tokenService.getAccessToken();
    const refreshToken = this.tokenService.getRefreshToken();

    if (accessToken && refreshToken) {
      // Decodifica il token per ottenere le info utente
      const userFromToken = this.tokenService.getUserFromToken();

      if (userFromToken) {
        // Token valido, ripristina la sessione
        this.authStore.setUser(userFromToken);
        // Connetti WebSocket se utente già loggato (reload pagina)
        this.websocketService.connect();
      } else {
        // Access token scaduto, tenta il refresh automatico
        try {
          this.logger.info('Access token scaduto, tentativo di refresh automatico...');
          await firstValueFrom(this.refreshToken());

          // Refresh riuscito, ora ripristina la sessione con il nuovo token
          const newUserFromToken = this.tokenService.getUserFromToken();
          if (newUserFromToken) {
            this.authStore.setUser(newUserFromToken);
            this.websocketService.connect();
            this.logger.info('Sessione ripristinata con successo dopo refresh token');
          } else {
            // Nuovo token non valido (non dovrebbe mai succedere)
            this.handleLogoutSuccess();
          }
        } catch {
          // Refresh fallito, effettua logout
          this.logger.warn('Refresh token fallito, sessione scaduta');
          this.handleLogoutSuccess();
        }
      }
    }
  }

  /**
   * Gestisce il successo dell'autenticazione
   */
  private handleAuthSuccess(response: LoginResponseDTO): void {
    // Salva i token
    this.tokenService.saveTokens(response.accessToken, response.refreshToken);

    // Aggiorna lo store
    this.authStore.setUser(response.user);
    // Connetti WebSocket dopo login
    this.websocketService.connect();
  }

  /**
   * Gestisce il successo del logout
   */
  private handleLogoutSuccess(): void {
    this.websocketService.disconnect();
    // Rimuove i token
    this.tokenService.clearTokens();

    // Pulisce lo store
    this.authStore.clearUser();

    // Naviga alla pagina di login
    this.router.navigate(['/auth/login']);
  }

  /**
   * Gestisce gli errori di autenticazione
   */
  private handleAuthError(error: unknown): Observable<never> {
    this.logger.error('Errore autenticazione', error);
    return throwError(() => error);
  }
}
