import { DestroyRef, computed, effect, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription, firstValueFrom, interval } from 'rxjs';
import { UserService } from '../api/user-service';
import { UserSummaryDTO } from '../../models';
import { TokenService } from '../auth/services/token-service';
import { WebsocketService } from '../services/websocket-service';
import { LoggerService } from '../services/logger.service';

@Injectable({
  providedIn: 'root',
})
export class OnlineUsersStore {
  private readonly userService = inject(UserService);
  private readonly tokenService = inject(TokenService);
  private readonly websocketService = inject(WebsocketService);
  private readonly logger = inject(LoggerService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly REFRESH_INTERVAL = 60000; // 1 minuto

  private pollingSubscription: Subscription | null = null;

  // SIGNALS PRIVATI

  private readonly _onlineUsers = signal<UserSummaryDTO[]>([]);
  private readonly _loading = signal<boolean>(false);
  private readonly _lastUpdate = signal<Date | null>(null);

  // SIGNALS PUBBLICI READONLY

  readonly onlineUsers = this._onlineUsers.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly lastUpdate = this._lastUpdate.asReadonly();

  // COMPUTED SIGNALS

  readonly onlineCount = computed(() => this._onlineUsers().length);
  readonly hasOnlineUsers = computed(() => this._onlineUsers().length > 0);

  readonly sortedByUsername = computed(() =>
    [...this._onlineUsers()].sort((a, b) => a.username.localeCompare(b.username))
  );

  readonly sortedByName = computed(() =>
    [...this._onlineUsers()].sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto))
  );

  constructor() {
    // Sottoscrivi eventi WebSocket per aggiornamenti real-time
    this.websocketService.userPresence$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => {
        if (event.type === 'user_online') {
          const userSummary: UserSummaryDTO = {
            id: event.userId,
            username: event.username,
            nomeCompleto: event.nomeCompleto,
            profilePictureUrl: event.profilePictureUrl,
            isOnline: true,
            classroom: event.classroom ?? null,
          };
          this.markUserOnline(userSummary);
        } else if (event.type === 'user_offline') {
          this.markUserOffline(event.userId);
        }
      });

    // Quando il WebSocket si connette, (ri)carica la lista e avvia polling
    effect(() => {
      if (this.websocketService.connected()) {
        this.loadOnlineUsers();
      }
    });

    // Carica subito se già autenticato: non aspettare la WS (es. reload pagina o WS lenta)
    if (this.tokenService.isTokenValid()) {
      this.loadOnlineUsers();
    }
  }

  /**
   * Carica gli utenti online e avvia il polling come fallback.
   * Idempotente: se il polling è già attivo non ne crea un secondo.
   */
  async loadOnlineUsers(): Promise<void> {
    this._loading.set(true);

    try {
      const response = await firstValueFrom(this.userService.getAllUsers(0, 1000));
      if (!response) return;

      const fromApi = response.content.filter((u) => u.isOnline);
      // Merge: mantieni gli utenti arrivati via WebSocket mentre la HTTP era in volo
      this._onlineUsers.update((current) => {
        const merged = new Map(fromApi.map((u) => [u.id, u]));
        current.forEach((u) => { if (!merged.has(u.id)) merged.set(u.id, u); });
        return Array.from(merged.values());
      });
      this._lastUpdate.set(new Date());
    } catch (error) {
      this.logger.error('Errore caricamento utenti online', error);
    } finally {
      this._loading.set(false);
    }

    this.startPolling();
  }

  /**
   * Avvia il polling automatico. Idempotente.
   * Usato come fallback se il WebSocket perde eventi di presenza.
   */
  startPolling(): void {
    if (this.pollingSubscription || !this.tokenService.getAccessToken()) {
      return;
    }

    this.pollingSubscription = interval(this.REFRESH_INTERVAL)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.tokenService.getAccessToken()) {
          this.refreshOnlineUsers();
        } else {
          this.stopPolling();
        }
      });
  }

  stopPolling(): void {
    this.pollingSubscription?.unsubscribe();
    this.pollingSubscription = null;
    this._onlineUsers.set([]);
    this._lastUpdate.set(null);
  }

  /**
   * Refresh silenzioso — non mostra lo stato di loading.
   */
  async refreshOnlineUsers(): Promise<void> {
    try {
      const response = await firstValueFrom(this.userService.getAllUsers(0, 1000));
      if (!response) return;

      this._onlineUsers.set(response.content.filter((u) => u.isOnline));
      this._lastUpdate.set(new Date());
    } catch (error) {
      this.logger.debug('Errore refresh utenti online (silente)', error);
    }
  }

  isUserOnline(userId: number): boolean {
    return this._onlineUsers().some((user) => user.id === userId);
  }

  isUsernameOnline(username: string): boolean {
    return this._onlineUsers().some((user) => user.username === username);
  }

  getOnlineUser(userId: number): UserSummaryDTO | undefined {
    return this._onlineUsers().find((user) => user.id === userId);
  }

  searchOnlineUsers(searchTerm: string): UserSummaryDTO[] {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return this._onlineUsers();

    return this._onlineUsers().filter(
      (user) =>
        user.username.toLowerCase().includes(term) ||
        user.nomeCompleto.toLowerCase().includes(term)
    );
  }

  getOnlineUsersExcluding(excludeIds: number[]): UserSummaryDTO[] {
    const excludeSet = new Set(excludeIds);
    return this._onlineUsers().filter((user) => !excludeSet.has(user.id));
  }

  markUserOnline(user: UserSummaryDTO): void {
    this._onlineUsers.update((users) => {
      const index = users.findIndex((u) => u.id === user.id);
      if (index === -1) {
        return [...users, { ...user, isOnline: true }];
      }
      const updated = [...users];
      updated[index] = { ...user, isOnline: true };
      return updated;
    });
  }

  markUserOffline(userId: number): void {
    this._onlineUsers.update((users) => users.filter((user) => user.id !== userId));
  }

  updateOnlineUser(userId: number, updates: Partial<UserSummaryDTO>): void {
    this._onlineUsers.update((users) =>
      users.map((user) => (user.id === userId ? { ...user, ...updates, isOnline: true } : user))
    );
  }

  clear(): void {
    this._onlineUsers.set([]);
    this._loading.set(false);
    this._lastUpdate.set(null);
  }

  async forceRefresh(): Promise<void> {
    await this.loadOnlineUsers();
  }

  isStale(): boolean {
    const lastUpdate = this._lastUpdate();
    if (!lastUpdate) return true;
    const diffMinutes = (Date.now() - lastUpdate.getTime()) / 1000 / 60;
    return diffMinutes > 1;
  }

  groupByInitial(): Map<string, UserSummaryDTO[]> {
    const grouped = new Map<string, UserSummaryDTO[]>();

    this._onlineUsers().forEach((user) => {
      const initial = user.nomeCompleto.charAt(0).toUpperCase();
      const group = grouped.get(initial) ?? [];
      group.push(user);
      grouped.set(initial, group);
    });

    grouped.forEach((users, key) => {
      const sortedUsers = [...users].sort((a, b) =>
        a.nomeCompleto.localeCompare(b.nomeCompleto)
      );
      grouped.set(key, sortedUsers);
    });

    return grouped;
  }

  getStats(): OnlineUsersStats {
    return {
      totalOnline: this._onlineUsers().length,
      lastUpdate: this._lastUpdate(),
      isStale: this.isStale(),
    };
  }
}

export interface OnlineUsersStats {
  totalOnline: number;
  lastUpdate: Date | null;
  isStale: boolean;
}
