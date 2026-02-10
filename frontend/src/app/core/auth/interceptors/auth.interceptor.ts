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
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenService = inject(TokenService);

  // Endpoint pubblici che non richiedono autenticazione
  const publicEndpoints = [
    '/auth/login',
    '/auth/register',
    '/auth/reset-password',
    '/auth/confirm-reset-password',
    '/auth/validate-reset-token'
  ];

  // Verifica se l'URL è pubblico
  const isPublicEndpoint = publicEndpoints.some(endpoint => 
    req.url.includes(endpoint)
  );

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