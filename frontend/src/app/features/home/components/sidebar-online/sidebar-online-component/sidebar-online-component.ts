import { Component, inject, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule, MessageSquare } from 'lucide-angular';
import { UserListItemComponent } from '../../../../../shared/components/user-list-item/user-list-item-component/user-list-item-component';
import { SkeletonComponent } from '../../../../../shared/ui/skeleton/skeleton-component/skeleton-component';
import { OnlineUsersStore } from '../../../../../core/stores/online-users-store';
import { UserService } from '../../../../../core/api/user-service';
import { AuthStore } from '../../../../../core/stores/auth-store';
import { UserSummaryDTO } from '../../../../../models';
import { LoggerService } from '../../../../../core/services/logger.service';

@Component({
  selector: 'app-sidebar-online-component',
  imports: [CommonModule,
    RouterLink,
    LucideAngularModule,
    UserListItemComponent,
    SkeletonComponent,
    ],
  templateUrl: './sidebar-online-component.html',
  styleUrl: './sidebar-online-component.scss',
})
export class SidebarOnlineComponent implements OnInit {
  private readonly onlineUsersStore = inject(OnlineUsersStore);
  private readonly userService = inject(UserService);
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly logger = inject(LoggerService);

  // Icone Lucide
  readonly MessageSquareIcon = MessageSquare;

  // Stato caricamento utenti offline
  readonly loadingOffline = this.onlineUsersStore.loading;

  // Tutti gli utenti (signal per reattività)
  private readonly _allUsers = signal<UserSummaryDTO[]>([]);
  private readonly _loadedAllUsers = signal<boolean>(false);

  ngOnInit(): void {
    // Carica utenti online
    this.onlineUsersStore.loadOnlineUsers();

    // Carica tutti gli utenti per mostrare anche gli offline
    this.loadAllUsers();
  }

  /**
   * Carica tutti gli utenti della piattaforma
   */
  private loadAllUsers(): void {
    this.userService.getAllUsers(0, 100).subscribe({
      next: (response) => {
        this._allUsers.set(response.content);
        this._loadedAllUsers.set(true);
      },
      error: (error) => {
        this.logger.error('Errore caricamento utenti', error);
      },
    });
  }

  /**
   * Utenti online (escluso l'utente corrente)
   */
  readonly onlineUsers = computed(() => {
    const currentUserId = this.authStore.userId();
    return this.onlineUsersStore
      .onlineUsers()
      .filter((user) => user.id !== currentUserId);
  });

  /**
   * Utenti offline (tutti gli utenti - online - utente corrente)
   */
  readonly offlineUsers = computed(() => {
    const currentUserId = this.authStore.userId();
    const onlineIds = new Set(this.onlineUsersStore.onlineUsers().map((u) => u.id));
    const allUsers = this._allUsers();

    return allUsers.filter(
      (user) => user.id !== currentUserId && !onlineIds.has(user.id)
    );
  });

  /**
   * Verifica se ci sono utenti online
   */
  readonly hasOnlineUsers = computed(() => this.onlineUsers().length > 0);

  /**
   * Verifica se ci sono utenti offline
   */
  readonly hasOfflineUsers = computed(() => this.offlineUsers().length > 0);

  /**
   * Verifica se il caricamento è completato
   */
  readonly isLoaded = computed(() => this._loadedAllUsers());

  /**
   * Naviga ai messaggi privati
   */
  goToMessages(): void {
    this.router.navigate(['/messages']);
  }

  /**
   * Naviga alla chat con l'utente
   */
  onUserClick(userId: number): void {
    this.router.navigate(['/messages', userId]);
  }

  /**
   * Avvia una conversazione con l'utente
   */
  startConversation(event: Event, userId: number): void {
    event.stopPropagation();
    this.router.navigate(['/messages'], { queryParams: { user: userId } });
  }
}
