import { Routes } from '@angular/router';
import { authGuard } from '../../core/auth/guards/auth-guard';

export const messagesRoutes: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./messages-layout/messages-layout-component/messages-layout-component').then((m) => m.MessagesLayoutComponent),
    children: [
      {
        path: ':userId',
        loadComponent: () =>
          import('./chat/chat-component/chat-component').then((m) => m.ChatComponent),
        title: 'Chat - beetUs',
      },
    ],
  },
];
