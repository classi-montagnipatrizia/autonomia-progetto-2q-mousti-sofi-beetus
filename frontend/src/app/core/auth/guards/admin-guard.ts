import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth-service';

/**
 * Guard per proteggere le route riservate agli amministratori
 *
 * Utilizzo in app.routes.ts:
 * { path: 'admin', component: AdminComponent, canActivate: [adminGuard] }
 */
export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Verifica autenticazione
  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/auth/login']);
  }

  // Verifica ruolo admin
  if (authService.isAdmin()) {
    return true;
  }

  // Reindirizza alla home se non è admin
  return router.createUrlTree(['/']);
};