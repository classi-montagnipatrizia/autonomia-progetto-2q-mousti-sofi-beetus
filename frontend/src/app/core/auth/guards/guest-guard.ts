import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth-service';

/**
 * Guard per proteggere le route accessibili solo a utenti NON autenticati
 *
 * Utilizzo in app.routes.ts:
 * { path: 'login', component: LoginComponent, canActivate: [guestGuard] }
 * { path: 'register', component: RegisterComponent, canActivate: [guestGuard] }
 */
export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return true;
  }

  // Reindirizza alla home se già autenticato
  return router.createUrlTree(['/']);
};
