import { authGuard } from '../../core/auth/guards/auth-guard';
import { MainLayoutComponent } from '../../layout/main-layout/main-layout-component/main-layout-component';
import { Routes } from '@angular/router';
export const homeRoutes: Routes = [
  // Messaggi - Full screen senza header (stile WhatsApp)
  {
    path: 'messages',
    canActivate: [authGuard],
    loadComponent: () =>
      import('../messages/messages-layout/messages-layout-component/messages-layout-component').then((m) => m.MessagesLayoutComponent),
    title: 'Messaggi - beetUs',
    children: [
      {
        path: ':userId',
        loadComponent: () =>
          import('../messages/chat/chat-component/chat-component').then((m) => m.ChatComponent),
        title: 'Chat - beetUs',
      },
    ],
  },
  // Post detail - Full screen senza header
  {
    path: 'post/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('../post/post-detail/post-detail-component/post-detail-component').then((m) => m.PostDetailComponent),
    title: 'Post - beetUs',
  },
  // Notifications - Full screen senza header
  {
    path: 'notifications',
    canActivate: [authGuard],
    loadComponent: () =>
      import('../notifications/notifications-list-component/notifications-list-component').then((m) => m.NotificationsListComponent),
    title: 'Notifiche - beetUs',
  },
  // Search - Full screen senza header
  {
    path: 'search',
    canActivate: [authGuard],
    loadComponent: () =>
      import('../search/search-results-component/search-results-component').then((m) => m.SearchResultsComponent),
    title: 'Cerca - beetUs',
  },
  // Settings - Full screen senza header
  {
    path: 'settings',
    canActivate: [authGuard],
    loadComponent: () =>
      import('../settings/settings-component/settings-component').then((m) => m.SettingsComponent),
    title: 'Impostazioni - beetUs',
  },
  // Profile - Full screen senza header
  {
    path: 'profile/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('../profile-view/profile-view-component/profile-view-component').then((m) => m.ProfileComponent),
    title: 'Profilo - beetUs',
  },
  // Feed - Solo questa con header
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./feed/feed-component/feed-component').then((m) => m.FeedComponent),
        title: 'Home - beetUs',
      },
    ],
  },
];
