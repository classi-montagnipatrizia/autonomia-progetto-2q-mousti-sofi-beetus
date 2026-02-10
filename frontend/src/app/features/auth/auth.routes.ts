import { Routes } from '@angular/router';
import { guestGuard } from '../../core/auth/guards/guest-guard';

export const authRoutes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./login/login-component/login-component').then((m) => m.LoginComponent),
    title: 'Accedi - beetUs',
    canActivate: [guestGuard],
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./register/register-component/register-component').then((m) => m.RegisterComponent),
    title: 'Registrati - beetUs',
    canActivate: [guestGuard],
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./reset-password/reset-password-component/reset-password-component').then(
        (m) => m.ResetPasswordComponent
      ),
    title: 'Reimposta Password - beetUs',
    canActivate: [guestGuard],
  },
  {
    path: 'verify-email',
    loadComponent: () =>
      import('./verify-email/verify-email-component/verify-email-component').then(
        (m) => m.VerifyEmailComponent
      ),
    title: 'Verifica Email - beetUs',
    canActivate: [guestGuard],
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
];
