import { Routes } from '@angular/router';
import { authGuard } from '../../core/auth/guards/auth-guard';

export const libraryRoutes: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./library-page/library-page').then((m) => m.LibraryPage),
    title: 'Libreria - beetUs',
  },
  {
    path: 'ai-chat',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./ai-chatbot/ai-chatbot').then((m) => m.AiChatbot),
    title: 'beetAI - beetUs',
  },
  {
    path: 'conversation/:bookId',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./book-conversation/book-conversation').then((m) => m.BookConversation),
    title: 'Conversazione Libro - beetUs',
  },
  {
    path: ':id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./book-detail/book-detail').then((m) => m.BookDetail),
    title: 'Dettaglio Libro - beetUs',
  },
];
