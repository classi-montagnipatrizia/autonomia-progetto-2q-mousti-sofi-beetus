import { computed, inject, Injectable, signal } from '@angular/core';
import { NotificationService } from '../api/notification-service';
import { WebsocketService } from '../services/websocket-service';
import { NotificationResponseDTO } from '../../models';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { LoggerService } from '../services/logger.service';

@Injectable({
  providedIn: 'root',
})
export class NotificationStore {
  private readonly notificationService = inject(NotificationService);
  private readonly websocketService = inject(WebsocketService);
  private readonly logger = inject(LoggerService);

  // ============================================================================
  // SIGNALS PRIVATI
  // ============================================================================

  private readonly _notifications = signal<NotificationResponseDTO[]>([]);
  private readonly _unreadCount = signal<number>(0);
  private readonly _loading = signal<boolean>(false);
  private readonly _hasMore = signal<boolean>(true);
  private readonly _currentPage = signal<number>(0);

  // ============================================================================
  // SIGNALS PUBBLICI READONLY
  // ============================================================================

  readonly notifications = this._notifications.asReadonly();
  readonly unreadCount = this._unreadCount.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly hasMore = this._hasMore.asReadonly();

  // ============================================================================
  // COMPUTED SIGNALS
  // ============================================================================

  /** Notifiche non lette */
  readonly unreadNotifications = computed(() =>
    this._notifications().filter(n => !n.isRead)
  );

  /** Notifiche lette */
  readonly readNotifications = computed(() =>
    this._notifications().filter(n => n.isRead)
  );

  /** Verifica se ci sono notifiche non lette */
  readonly hasUnread = computed(() => this._unreadCount() > 0);

  /** Ultime N notifiche (per dropdown header) */
  readonly recentNotifications = computed(() =>
    this._notifications().slice(0, 10)
  );

  // ============================================================================
  // COSTRUTTORE - Setup WebSocket
  // ============================================================================

  constructor() {
    // Sottoscrizione alle notifiche real-time via WebSocket
    this.websocketService.notifications$
      .pipe(takeUntilDestroyed())
      .subscribe((notification: NotificationResponseDTO) => {
        this.handleNewNotification(notification);
      });
  }

  // ============================================================================
  // METODI PUBBLICI - Caricamento Notifiche
  // ============================================================================

  /**
   * Carica le notifiche (paginato)
   *
   * @param page numero pagina (default 0)
   * @param size elementi per pagina (default 20)
   */
  async loadNotifications(page: number = 0, size: number = 20): Promise<void> {
    this._loading.set(true);

    try {
      const response = await firstValueFrom(this.notificationService.getNotifications(page, size));

      if (!response) return;

      // Se è la prima pagina, sostituisce la lista
      // Altrimenti aggiunge alla fine (infinite scroll)
      if (page === 0) {
        this._notifications.set(response.content);
      } else {
        this._notifications.update(current => [...current, ...response.content]);
      }

      this._currentPage.set(page);
      this._hasMore.set(!response.last);
    } catch (error) {
      this.logger.error('Errore caricamento notifiche', error);
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Carica la pagina successiva (infinite scroll)
   */
  async loadMore(): Promise<void> {
    if (!this._hasMore() || this._loading()) return;

    const nextPage = this._currentPage() + 1;
    await this.loadNotifications(nextPage);
  }

  /**
   * Carica solo le notifiche non lette
   */
  async loadUnreadNotifications(): Promise<void> {
    this._loading.set(true);

    try {
      const unread = await firstValueFrom(this.notificationService.getUnreadNotifications());

      if (unread) {
        this._notifications.set(unread);
        this._hasMore.set(false); // Non ha paginazione
      }
    } catch (error) {
      this.logger.error('Errore caricamento notifiche non lette', error);
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Carica le ultime N notifiche recenti
   * Utile per popolare il dropdown nell'header
   *
   * @param limit numero massimo di notifiche (default 10)
   */
  async loadRecentNotifications(limit: number = 10): Promise<void> {
    try {
      const recent = await firstValueFrom(this.notificationService.getRecentNotifications(limit));

      if (recent) {
        // Aggiorna solo le notifiche recenti senza svuotare la lista
        this._notifications.update(current => {
          // Rimuove duplicati e aggiunge le nuove all'inizio
          const existingIds = new Set(current.map(n => n.id));
          const newNotifications = recent.filter(n => !existingIds.has(n.id));
          return [...newNotifications, ...current];
        });
      }
    } catch (error) {
      this.logger.error('Errore caricamento notifiche recenti', error);
    }
  }

  /**
   * Ricarica il conteggio delle notifiche non lette
   */
  async loadUnreadCount(): Promise<void> {
    try {
      const response = await firstValueFrom(this.notificationService.getUnreadCount());

      if (response) {
        this._unreadCount.set(response.unreadCount);
      }
    } catch (error) {
      this.logger.error('Errore caricamento conteggio non lette', error);
    }
  }

  // ============================================================================
  // METODI PUBBLICI - Gestione Notifiche
  // ============================================================================

  /**
   * Marca una notifica come letta
   *
   * @param notificationId ID della notifica
   */
  async markAsRead(notificationId: number): Promise<void> {
    try {
      await firstValueFrom(this.notificationService.markAsRead(notificationId));

      // Aggiorna lo stato locale
      this._notifications.update(notifications =>
        notifications.map(n =>
          n.id === notificationId ? { ...n, isRead: true } : n
        )
      );

      // Decrementa il conteggio non lette
      this._unreadCount.update(count => Math.max(0, count - 1));
    } catch (error) {
      this.logger.error('Errore marcatura notifica come letta', error);
      throw error;
    }
  }

  /**
   * Marca tutte le notifiche come lette
   */
  async markAllAsRead(): Promise<void> {
    try {
      await firstValueFrom(this.notificationService.markAllAsRead());

      // Aggiorna tutte le notifiche locali
      this._notifications.update(notifications =>
        notifications.map(n => ({ ...n, isRead: true }))
      );

      // Azzera il conteggio
      this._unreadCount.set(0);
    } catch (error) {
      this.logger.error('Errore marcatura tutte come lette', error);
      throw error;
    }
  }

  /**
   * Elimina una singola notifica
   *
   * @param notificationId ID della notifica da eliminare
   */
  async deleteNotification(notificationId: number): Promise<void> {
    try {
      // Controlla se la notifica è non letta prima di eliminare
      const notification = this._notifications().find(n => n.id === notificationId);
      const wasUnread = notification?.isRead === false;

      await firstValueFrom(this.notificationService.deleteNotification(notificationId));

      // Rimuove dalla lista locale
      this._notifications.update(notifications =>
        notifications.filter(n => n.id !== notificationId)
      );

      // Se era non letta, decrementa il conteggio
      if (wasUnread) {
        this._unreadCount.update(count => Math.max(0, count - 1));
      }
    } catch (error) {
      this.logger.error('Errore eliminazione notifica', error);
      throw error;
    }
  }

  /**
   * Elimina tutte le notifiche lette
   */
  async deleteReadNotifications(): Promise<void> {
    try {
      const response = await firstValueFrom(this.notificationService.deleteReadNotifications());

      // Rimuove le notifiche lette dalla lista locale
      this._notifications.update(notifications =>
        notifications.filter(n => !n.isRead)
      );
    } catch (error) {
      this.logger.error('Errore eliminazione notifiche lette', error);
      throw error;
    }
  }

  // ============================================================================
  // METODI PRIVATI - WebSocket
  // ============================================================================

  /**
   * Gestisce l'arrivo di una nuova notifica via WebSocket
   *
   * @param notification notifica ricevuta in real-time
   */
  private handleNewNotification(notification: NotificationResponseDTO): void {
    // Aggiunge la notifica all'inizio della lista (più recente)
    this._notifications.update(current => [notification, ...current]);

    // Incrementa il conteggio non lette se la notifica è non letta
    if (!notification.isRead) {
      this._unreadCount.update(count => count + 1);
    }
  }

  // ============================================================================
  // METODI PUBBLICI - Utility
  // ============================================================================

  /**
   * Pulisce lo store (dopo logout)
   */
  clear(): void {
    this._notifications.set([]);
    this._unreadCount.set(0);
    this._loading.set(false);
    this._hasMore.set(true);
    this._currentPage.set(0);
  }

  /**
   * Refresh completo dello store
   * Ricarica notifiche e conteggio
   */
  async refresh(): Promise<void> {
    await Promise.all([
      this.loadNotifications(0),
      this.loadUnreadCount()
    ]);
  }

  /**
   * Verifica se una notifica specifica esiste
   */
  hasNotification(notificationId: number): boolean {
    return this._notifications().some(n => n.id === notificationId);
  }

  /**
   * Ottiene una notifica specifica per ID
   */
  getNotification(notificationId: number): NotificationResponseDTO | undefined {
    return this._notifications().find(n => n.id === notificationId);
  }

  /**
   * Filtra notifiche per tipo
   */
  getNotificationsByType(type: string): NotificationResponseDTO[] {
    return this._notifications().filter(n => n.tipo === type);
  }
}
