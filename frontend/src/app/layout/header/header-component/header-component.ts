import { Component, inject, signal, computed, OnInit, OnDestroy, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule, Bell, Search, Settings, LogOut, User, Shield, X, Menu } from 'lucide-angular';

import { AuthStore } from '../../../core/stores/auth-store';
import { NotificationStore } from '../../../core/stores/notification-store';
import { OnlineUsersStore } from '../../../core/stores/online-users-store';
import { AuthService } from '../../../core/auth/services/auth-service';
import { WebsocketService } from '../../../core/services/websocket-service';
import { DialogService } from '../../../core/services/dialog-service';
import { LoggerService } from '../../../core/services/logger.service';

import { AvatarComponent } from '../../../shared/ui/avatar/avatar-component/avatar-component';
import { SearchDropdownComponent } from '../../../shared/components/search-dropdown/search-dropdown-component/search-dropdown-component';

@Component({
  selector: 'app-header',
  imports: [
    CommonModule,
    RouterLink,
    LucideAngularModule,
    AvatarComponent,
    SearchDropdownComponent,
  ],
  templateUrl: './header-component.html',
  styleUrl: './header-component.scss',
})
export class HeaderComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly authStore = inject(AuthStore);
  private readonly notificationStore = inject(NotificationStore);
  private readonly onlineUsersStore = inject(OnlineUsersStore);
  private readonly authService = inject(AuthService);
  private readonly websocketService = inject(WebsocketService);
  private readonly dialogService = inject(DialogService);
  private readonly elementRef = inject(ElementRef);
  private readonly logger = inject(LoggerService);

  // Icone Lucide
  readonly BellIcon = Bell;
  readonly SearchIcon = Search;
  readonly SettingsIcon = Settings;
  readonly LogOutIcon = LogOut;
  readonly UserIcon = User;
  readonly ShieldIcon = Shield;
  readonly XIcon = X;
  readonly MenuIcon = Menu;

  // ========== STATE ==========

  /** Mostra/nasconde dropdown notifiche */
  readonly isNotificationsOpen = signal<boolean>(false);

  /** Mostra/nasconde dropdown utente */
  readonly isUserMenuOpen = signal<boolean>(false);

  /** Mostra/nasconde ricerca mobile */
  readonly isMobileSearchOpen = signal<boolean>(false);

  // ========== COMPUTED ==========

  /** Utente corrente */
  readonly currentUser = computed(() => this.authStore.currentUser());

  /** L'utente è admin? */
  readonly isAdmin = computed(() => this.authStore.isAdmin());

  /** Conteggio notifiche non lette */
  readonly unreadCount = computed(() => this.notificationStore.unreadCount());

  /** Ha notifiche non lette? */
  readonly hasUnread = computed(() => this.notificationStore.hasUnread());

  /** Ultime notifiche per dropdown */
  readonly recentNotifications = computed(() => this.notificationStore.recentNotifications());

  /** Nome completo utente o username come fallback */
  readonly displayName = computed(() => {
    const user = this.currentUser();
    return user?.nomeCompleto || user?.username || 'Utente';
  });

  /** Avatar URL */
  readonly avatarUrl = computed(() => this.currentUser()?.profilePictureUrl ?? null);

  // ========== LIFECYCLE ==========

  ngOnInit(): void {
    // Carica il conteggio iniziale delle notifiche
    this.notificationStore.loadUnreadCount();
  }

  ngOnDestroy(): void {
    // Cleanup all dropdown states when component is destroyed
    this.closeAllDropdowns();
  }

  // ========== CLICK OUTSIDE ==========

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    
    // Chiudi dropdown se clicco fuori (non chiude il mobile search)
    if (!this.elementRef.nativeElement.contains(target)) {
      this.closeDropdownMenus();
    }
  }

  /**
   * Chiude solo i dropdown menu (notifiche e utente)
   */
  private closeDropdownMenus(): void {
    this.isNotificationsOpen.set(false);
    this.isUserMenuOpen.set(false);
  }

  // ========== ACTIONS ==========

  /**
   * Toggle dropdown notifiche
   */
  toggleNotifications(event: Event): void {
    event.stopPropagation();
    this.isUserMenuOpen.set(false);
    this.isNotificationsOpen.update(v => !v);

    // Se apro le notifiche, carico la prima pagina (le più recenti)
    // Usa lo stesso endpoint della pagina notifiche per consistenza
    if (this.isNotificationsOpen()) {
      this.notificationStore.loadNotifications(0, 10);
    }
  }

  /**
   * Toggle dropdown menu utente
   */
  toggleUserMenu(event: Event): void {
    event.stopPropagation();
    this.isNotificationsOpen.set(false);
    this.isUserMenuOpen.update(v => !v);
  }

  /**
   * Toggle ricerca mobile
   */
  toggleMobileSearch(): void {
    this.isMobileSearchOpen.update(v => !v);
  }

  /**
   * Chiudi tutti i dropdown
   */
  closeAllDropdowns(): void {
    this.isNotificationsOpen.set(false);
    this.isUserMenuOpen.set(false);
    this.isMobileSearchOpen.set(false);
  }

  /**
   * Vai al profilo utente
   */
  goToProfile(): void {
    this.closeAllDropdowns();
    const userId = this.authStore.userId();
    if (userId) {
      this.router.navigate(['/profile', userId]);
    }
  }

  /**
   * Vai al pannello admin
   */
  goToAdmin(): void {
    this.closeAllDropdowns();
    this.router.navigate(['/admin']);
  }

  /**
   * Vai alle impostazioni
   */
  goToSettings(): void {
    this.closeAllDropdowns();
    this.router.navigate(['/settings']);
  }

  /**
   * Vai alla pagina notifiche
   */
  goToNotifications(): void {
    this.closeAllDropdowns();
    this.router.navigate(['/notifications']);
  }

  /**
   * Logout con conferma
   */
  async logout(): Promise<void> {
    this.closeAllDropdowns();
    
    // Chiedi conferma prima del logout
    const confirmed = await this.dialogService.confirmDangerous({
      title: 'Conferma logout',
      message: 'Sei sicuro di voler uscire dal tuo account?',
      confirmText: 'Esci',
      cancelText: 'Annulla',
    });

    if (!confirmed) {
      return;
    }

    // Ferma il polling degli utenti online
    this.onlineUsersStore.stopPolling();
    
    // Disconnetti WebSocket
    this.websocketService.disconnect();
    
    // Effettua logout
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/auth/login']);
      },
      error: (error) => {
        this.logger.error('Errore durante il logout', error);
        // Naviga comunque al login
        this.router.navigate(['/auth/login']);
      }
    });
  }

  /**
   * Clicca su una notifica
   */
  onNotificationClick(notification: any): void {
    // Marca come letta
    if (!notification.isRead) {
      this.notificationStore.markAsRead(notification.id);
    }
    
    // Naviga all'URL della notifica
    if (notification.actionUrl) {
      this.closeAllDropdowns();
      this.router.navigateByUrl(notification.actionUrl);
    }
  }

  /**
   * Segna tutte le notifiche come lette
   */
  markAllAsRead(): void {
    this.notificationStore.markAllAsRead();
  }
}
