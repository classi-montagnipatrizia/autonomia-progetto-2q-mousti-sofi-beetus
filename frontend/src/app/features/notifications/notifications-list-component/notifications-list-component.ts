import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LucideAngularModule, ArrowLeft, Bell, Check, CheckCheck, Trash2, ListFilter } from 'lucide-angular';
import { Subject, takeUntil, finalize } from 'rxjs';

import { NotificationService } from '../../../core/api/notification-service';
import { NotificationResponseDTO, NotificationType, PageResponse } from '../../../models';
import { AvatarComponent } from '../../../shared/ui/avatar/avatar-component/avatar-component';
import { SkeletonComponent } from '../../../shared/ui/skeleton/skeleton-component/skeleton-component';
import { ButtonComponent } from '../../../shared/ui/button/button-component/button-component';
import { ToastService } from '../../../core/services/toast-service';
import { NotificationStore } from '../../../core/stores/notification-store';

type FilterType = 'all' | 'unread' | NotificationType;

@Component({
  selector: 'app-notifications-list-component',
  imports: [
    CommonModule,
    LucideAngularModule,
    AvatarComponent,
    SkeletonComponent,
    ButtonComponent,
  ],
  templateUrl: './notifications-list-component.html',
  styleUrl: './notifications-list-component.scss',
})
export class NotificationsListComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly notificationService = inject(NotificationService);
  private readonly notificationStore = inject(NotificationStore);
  private readonly toastService = inject(ToastService);
  private readonly destroy$ = new Subject<void>();

  // Icone
  readonly ArrowLeftIcon = ArrowLeft;
  readonly BellIcon = Bell;
  readonly CheckIcon = Check;
  readonly CheckCheckIcon = CheckCheck;
  readonly Trash2Icon = Trash2;
  readonly FilterIcon = ListFilter;

  // State
  readonly notifications = signal<NotificationResponseDTO[]>([]);
  readonly isLoading = signal(true);
  readonly isLoadingMore = signal(false);
  readonly currentPage = signal(0);
  readonly totalPages = signal(0);
  readonly activeFilter = signal<FilterType>('all');
  readonly isFilterDropdownOpen = signal(false);

  // Computed
  readonly hasMore = computed(() => this.currentPage() < this.totalPages() - 1);
  readonly isEmpty = computed(() => !this.isLoading() && this.notifications().length === 0);
  readonly unreadCount = computed(() => this.notifications().filter(n => !n.isRead).length);

  readonly filterOptions: { value: FilterType; label: string }[] = [
    { value: 'all', label: 'Tutte' },
    { value: 'unread', label: 'Non lette' },
    { value: NotificationType.LIKE, label: 'Mi piace' },
    { value: NotificationType.COMMENT, label: 'Commenti' },
    { value: NotificationType.MENTION, label: 'Menzioni' },
    { value: NotificationType.DIRECT_MESSAGE, label: 'Messaggi' },
  ];

  ngOnInit(): void {
    this.loadNotifications();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Carica le notifiche paginate
   */
  loadNotifications(reset = true): void {
    if (reset) {
      this.isLoading.set(true);
      this.currentPage.set(0);
      this.notifications.set([]);
    } else {
      this.isLoadingMore.set(true);
    }

    const page = this.currentPage();

    this.notificationService.getNotifications(page, 20)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoading.set(false);
          this.isLoadingMore.set(false);
        })
      )
      .subscribe({
        next: (response: PageResponse<NotificationResponseDTO>) => {
          const filtered = this.filterNotifications(response.content);
          if (reset) {
            this.notifications.set(filtered);
          } else {
            this.notifications.update(current => [...current, ...filtered]);
          }
          this.totalPages.set(response.totalPages);
        },
        error: () => {
          this.toastService.error('Errore nel caricamento delle notifiche');
        }
      });
  }

  /**
   * Filtra le notifiche in base al filtro attivo
   */
  private filterNotifications(notifs: NotificationResponseDTO[]): NotificationResponseDTO[] {
    const filter = this.activeFilter();
    
    if (filter === 'all') return notifs;
    if (filter === 'unread') return notifs.filter(n => !n.isRead);
    return notifs.filter(n => n.tipo === filter);
  }

  /**
   * Cambia il filtro attivo
   */
  setFilter(filter: FilterType): void {
    this.activeFilter.set(filter);
    this.isFilterDropdownOpen.set(false);
    this.loadNotifications(true);
  }

  /**
   * Carica più notifiche
   */
  loadMore(): void {
    if (this.hasMore() && !this.isLoadingMore()) {
      this.currentPage.update(p => p + 1);
      this.loadNotifications(false);
    }
  }

  /**
   * Segna una notifica come letta e naviga
   */
  onNotificationClick(notification: NotificationResponseDTO): void {
    if (!notification.isRead) {
      this.notificationService.markAsRead(notification.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.notifications.update(notifs =>
              notifs.map(n => n.id === notification.id ? { ...n, isRead: true } : n)
            );
            this.notificationStore.loadUnreadCount();
          }
        });
    }

    if (notification.actionUrl) {
      this.router.navigateByUrl(notification.actionUrl);
    }
  }

  /**
   * Segna tutte come lette
   */
  markAllAsRead(): void {
    this.notificationService.markAllAsRead()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notifications.update(notifs =>
            notifs.map(n => ({ ...n, isRead: true }))
          );
          this.notificationStore.loadUnreadCount();
          this.toastService.success('Tutte le notifiche segnate come lette');
        },
        error: () => {
          this.toastService.error('Errore durante l\'operazione');
        }
      });
  }

  /**
   * Elimina TUTTE le notifiche (lette e non lette)
   */
  deleteAllNotifications(): void {
    this.notificationService.deleteAllNotifications()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.notifications.set([]);
          this.notificationStore.loadUnreadCount();
          if (response.deletedCount > 0) {
            this.toastService.success(`${response.deletedCount} notifiche eliminate`);
          } else {
            this.toastService.info('Nessuna notifica da eliminare');
          }
        },
        error: () => {
          this.toastService.error('Errore durante l\'eliminazione');
        }
      });
  }

  /**
   * Elimina una singola notifica
   */
  deleteNotification(event: Event, notification: NotificationResponseDTO): void {
    event.stopPropagation();
    
    this.notificationService.deleteNotification(notification.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notifications.update(notifs => notifs.filter(n => n.id !== notification.id));
          if (!notification.isRead) {
            this.notificationStore.loadUnreadCount();
          }
        },
        error: () => {
          this.toastService.error('Errore durante l\'eliminazione');
        }
      });
  }

  /**
   * Ottieni l'icona per il tipo di notifica
   */
  getNotificationIcon(tipo: NotificationType): string {
    const iconMap: Record<NotificationType, string> = {
      [NotificationType.LIKE]: '❤️',
      [NotificationType.COMMENT]: '💬',
      [NotificationType.MENTION]: '@',
      [NotificationType.DIRECT_MESSAGE]: '✉️',
      [NotificationType.NEW_POST]: '📝',
    };
    return iconMap[tipo] || '🔔';
  }

  /**
   * Torna indietro
   */
  goBack(): void {
    this.router.navigate(['/']);
  }

  /**
   * Toggle filtro dropdown
   */
  toggleFilterDropdown(): void {
    this.isFilterDropdownOpen.update(v => !v);
  }

  /**
   * Ottieni label del filtro attivo
   */
  getActiveFilterLabel(): string {
    const filter = this.filterOptions.find(f => f.value === this.activeFilter());
    return filter?.label || 'Tutte';
  }
}

