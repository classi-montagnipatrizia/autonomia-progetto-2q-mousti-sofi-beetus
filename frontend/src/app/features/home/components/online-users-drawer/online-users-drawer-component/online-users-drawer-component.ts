import { Component, inject, computed, HostListener,signal } from '@angular/core';

import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule, Users, X, MessageSquare } from 'lucide-angular';
import { UserListItemComponent } from '../../../../../shared/components/user-list-item/user-list-item-component/user-list-item-component';
import { AuthStore } from '../../../../../core/stores/auth-store';
import { OnlineUsersStore } from '../../../../../core/stores/online-users-store';
import { OnlineDrawerService } from '../../../../../core/services/online-drawer.service';
import { UserService } from '../../../../../core/api/user-service';
import { UserSummaryDTO } from '../../../../../models';
import { LoggerService } from '../../../../../core/services/logger.service';


/**
 * Floating button per mobile che mostra gli utenti online.
 * Appare solo su schermi piccoli (< lg breakpoint).
 * Al click apre un drawer/bottom sheet con la lista utenti.
 */
@Component({
  selector: 'app-online-users-drawer',
  imports: [RouterLink, LucideAngularModule, UserListItemComponent],
  templateUrl: './online-users-drawer-component.html',
  styleUrl: './online-users-drawer-component.scss',
})
export class OnlineUsersDrawerComponent {
  private readonly onlineUsersStore = inject(OnlineUsersStore);
  private readonly authStore = inject(AuthStore);
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);
  private readonly logger = inject(LoggerService);
  private readonly drawerService = inject(OnlineDrawerService);

  // Icone
  readonly UsersIcon = Users;
  readonly XIcon = X;
  readonly MessageSquareIcon = MessageSquare;

  // Stato drawer (da servizio condiviso)
  readonly isOpen = this.drawerService.isOpen;

  // Tutti gli utenti per mostrare offline
  private readonly _allUsers = signal<UserSummaryDTO[]>([]);

  constructor() {
    // Carica tutti gli utenti
    this.loadAllUsers();
  }

  /**
   * Numero utenti online (escluso utente corrente)
   */
  readonly onlineCount = computed(() => {
    const currentUserId = this.authStore.userId();
    return this.onlineUsersStore.onlineUsers().filter(u => u.id !== currentUserId).length;
  });

  /**
   * Utenti online (escluso l'utente corrente)
   */
  readonly onlineUsers = computed(() => {
    const currentUserId = this.authStore.userId();
    return this.onlineUsersStore.onlineUsers().filter(u => u.id !== currentUserId);
  });

  /**
   * Utenti offline (tutti - online - utente corrente)
   */
  readonly offlineUsers = computed(() => {
    const currentUserId = this.authStore.userId();
    const onlineIds = new Set(this.onlineUsersStore.onlineUsers().map(u => u.id));
    return this._allUsers().filter(u => u.id !== currentUserId && !onlineIds.has(u.id));
  });

  readonly hasOnlineUsers = computed(() => this.onlineUsers().length > 0);
  readonly hasOfflineUsers = computed(() => this.offlineUsers().length > 0);

  private loadAllUsers(): void {
    this.userService.getAllUsers(0, 100).subscribe({
      next: response => this._allUsers.set(response.content),
      error: err => this.logger.error('Errore caricamento utenti', err),
    });
  }

  toggleDrawer(): void {
    this.drawerService.toggle();
  }

  closeDrawer(): void {
    this.drawerService.close();
  }

  onUserClick(userId: number): void {
    this.closeDrawer();
    this.router.navigate(['/messages', userId]);
  }

  // Chiudi drawer con Escape
  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.isOpen()) {
      this.closeDrawer();
    }
  }
}
