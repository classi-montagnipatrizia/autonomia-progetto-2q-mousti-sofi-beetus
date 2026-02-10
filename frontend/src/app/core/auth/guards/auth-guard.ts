import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth-service';

/**
 * Guard per proteggere le route che richiedono autenticazione
 *
 * Utilizzo in app.routes.ts:
 * { path: 'home', component: HomeComponent, canActivate: [authGuard] }
 * { path: 'profile', component: ProfileComponent, canActivate: [authGuard] }
 */
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  // Reindirizza al login se non autenticato
  return router.createUrlTree(['/auth/login']);
};