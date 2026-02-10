import { Routes } from '@angular/router';
import { adminGuard } from '../../core/auth/guards/admin-guard';

/**
 * Routes per la sezione amministrazione
 *
 * Tutte le route sono protette da adminGuard che verifica:
 * - L'utente sia autenticato
 * - L'utente abbia il ruolo di amministratore
 */
export const adminRoutes: Routes = [
  {
    path: '',
    canActivate: [adminGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./dashboard/dashboard-component/dashboard-component').then(
            (m) => m.DashboardComponent
          ),
        title: 'Dashboard Admin - beetUs',
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./users/users-component/users-component').then(
            (m) => m.UsersComponent
          ),
        title: 'Gestione Utenti - beetUs',
      },
      {
        path: 'moderation',
        loadComponent: () =>
          import('./moderation/moderation-component/moderation-component').then(
            (m) => m.ModerationComponent
          ),
        title: 'Moderazione - beetUs',
      },
      {
        path: 'audit-log',
        loadComponent: () =>
          import('./audit-log/audit-log-component/audit-log-component').then(
            (m) => m.AuditLogComponent
          ),
        title: 'Audit Log - beetUs',
      },
      {
        path: 'rate-limit',
        loadComponent: () =>
          import('./rate-limit/rate-limit-component/rate-limit-component').then(
            (m) => m.RateLimitComponent
          ),
        title: 'Rate Limit - beetUs',
      },
      {
        path: 'system',
        loadComponent: () =>
          import('./system/system-maintenance-component/system-maintenance-component').then(
            (m) => m.SystemMaintenanceComponent
          ),
        title: 'Manutenzione Sistema - beetUs',
      },
    ],
  },
];
