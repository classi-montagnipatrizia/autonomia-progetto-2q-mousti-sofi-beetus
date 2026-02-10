import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
  provideAppInitializer,
  inject, isDevMode,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './core/auth/interceptors/auth.interceptor';
import { errorInterceptor } from './core/auth/interceptors/error.interceptor';
import { TokenRefreshService } from './core/auth/services/token-refresh.service';
import { provideServiceWorker } from '@angular/service-worker';

/**
 * Inizializza il servizio di refresh automatico del token.
 * Questo garantisce che il token venga refreshato prima della scadenza,
 * evitando che l'utente venga disconnesso dopo 30 minuti.
 */
function initializeTokenRefresh(tokenRefreshService: TokenRefreshService) {
  return () => {
    // Il servizio si avvia automaticamente tramite il constructor effect
    return Promise.resolve();
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    // Configurazione HTTP client con interceptors
    // 1. authInterceptor viene eseguito PER PRIMO (aggiunge il token)
    // 2. errorInterceptor viene eseguito PER SECONDO (gestisce errori e refresh)
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
    // Inizializza il servizio di refresh automatico del token
    provideAppInitializer(() => {
      const tokenRefreshService = inject(TokenRefreshService);
      initializeTokenRefresh(tokenRefreshService)();
    }), provideServiceWorker('ngsw-worker.js', {
            enabled: !isDevMode(),
            registrationStrategy: 'registerWhenStable:30000'
          }),
  ],
};
