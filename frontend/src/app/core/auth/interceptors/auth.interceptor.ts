import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TokenService } from '../services/token-service';

/**
 * Interceptor per aggiungere automaticamente il token JWT alle richieste HTTP
 * 
 * Logica:
 * 1. Verifica se la richiesta necessita di autenticazione
 * 2. Se sì, recupera il token e lo aggiunge all'header Authorization
 * 3. Le richieste agli endpoint pubblici vengono ignorate
 */
const PUBLIC_ENDPOINT_PATHS: readonly string[] = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/reset-password',
  '/api/auth/confirm-reset-password',
  '/api/auth/validate-reset-token',
  '/api/auth/verify-email',
  '/api/auth/resend-verification',
  '/api/auth/refresh-token',
];

function isPublicUrl(url: string): boolean {
  let pathname: string;
  try {
    pathname = new URL(url, globalThis.location?.origin ?? 'http://localhost').pathname;
  } catch {
    pathname = url.split('?')[0];
  }
  return PUBLIC_ENDPOINT_PATHS.some(path => pathname === path || pathname.endsWith(path));
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenService = inject(TokenService);

  const isPublicEndpoint = isPublicUrl(req.url);

  // Header comuni (necessario per Ngrok free tier)
  const commonHeaders: Record<string, string> = {
    'ngrok-skip-browser-warning': 'true'
  };

  // Se è un endpoint pubblico, aggiungi solo l'header Ngrok
  if (isPublicEndpoint) {
    const clonedRequest = req.clone({
      setHeaders: commonHeaders
    });
    return next(clonedRequest);
  }

  // Recupera il token di accesso
  const token = tokenService.getAccessToken();

  // Se non c'è token, procedi con solo l'header Ngrok
  if (!token) {
    const clonedRequest = req.clone({
      setHeaders: commonHeaders
    });
    return next(clonedRequest);
  }

  // Clona la richiesta e aggiungi tutti gli header
  const clonedRequest = req.clone({
    setHeaders: {
      ...commonHeaders,
      Authorization: `Bearer ${token}`
    }
  });

  return next(clonedRequest);
};