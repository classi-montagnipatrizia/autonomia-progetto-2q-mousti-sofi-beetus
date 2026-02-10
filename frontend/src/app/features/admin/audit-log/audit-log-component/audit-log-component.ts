import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  LucideAngularModule,
  ArrowLeft,
  Search,
  ListFilter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Loader,
  FileText,
  User,
  Calendar,
  Activity,
} from 'lucide-angular';
import { Subject, takeUntil, finalize } from 'rxjs';

import { AdminService, AdminAuditLog } from '../../../../core/api/admin-service';
import { ToastService } from '../../../../core/services/toast-service';
import { ButtonComponent } from '../../../../shared/ui/button/button-component/button-component';
import { PageResponse } from '../../../../models';
import { LoggerService } from '../../../../core/services/logger.service';

@Component({
  selector: 'app-audit-log-component',
  imports: [
    CommonModule,
  
    FormsModule,
    LucideAngularModule,
    ButtonComponent,
  ],
  templateUrl: './audit-log-component.html',
  styleUrl: './audit-log-component.scss',
})
export class AuditLogComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly adminService = inject(AdminService);
  private readonly toastService = inject(ToastService);
  private readonly destroy$ = new Subject<void>();
  private readonly logger = inject(LoggerService);

  // Icone
  readonly ArrowLeftIcon = ArrowLeft;
  readonly SearchIcon = Search;
  readonly FilterIcon = ListFilter;
  readonly RefreshIcon = RefreshCw;
  readonly ChevronLeftIcon = ChevronLeft;
  readonly ChevronRightIcon = ChevronRight;
  readonly AlertCircleIcon = CircleAlert;
  readonly Loader2Icon = Loader;
  readonly FileTextIcon = FileText;
  readonly UserIcon = User;
  readonly CalendarIcon = Calendar;
  readonly ActivityIcon = Activity;

  // Stato
  readonly logs = signal<AdminAuditLog[]>([]);
  readonly isLoading = signal(false);
  readonly hasError = signal(false);

  // Paginazione
  readonly currentPage = signal(0);
  readonly pageSize = signal(20);
  readonly totalElements = signal(0);
  readonly totalPages = signal(0);

  // Filtri
  readonly filterAction = signal<string>('');
  readonly filterAdmin = signal<string>('');
  readonly showFilters = signal(false);

  // Azioni disponibili (per il filtro)
  readonly availableActions = [
    'ELIMINA_UTENTE',
    'DISABILITA_UTENTE',
    'ABILITA_UTENTE',
    'PROMUOVI_ADMIN',
    'DEGRADA_ADMIN',
    'ELIMINA_POST',
    'ELIMINA_COMMENTO',
    'ELIMINA_TUTTI_POST_UTENTE',
    'ELIMINA_TUTTI_COMMENTI_UTENTE',
    'VISUALIZZA_STATISTICHE',
    'PULIZIA_DATABASE',
    'RESET_RATE_LIMIT',
  ];

  readonly hasLogs = computed(() => this.logs().length > 0);
  readonly canGoToPrevPage = computed(() => this.currentPage() > 0);
  readonly canGoToNextPage = computed(() => this.currentPage() < this.totalPages() - 1);

  ngOnInit(): void {
    this.loadLogs();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Carica i log con filtri applicati
   */
  loadLogs(): void {
    this.isLoading.set(true);
    this.hasError.set(false);

    const action = this.filterAction();
    const adminId = this.filterAdmin() ? Number.parseInt(this.filterAdmin()) : null;

    let request$;

    if (action) {
      request$ = this.adminService.getAuditLogByAction(action, this.currentPage(), this.pageSize());
    } else if (adminId) {
      request$ = this.adminService.getAuditLogByAdmin(adminId, this.currentPage(), this.pageSize());
    } else {
      request$ = this.adminService.getAuditLog(this.currentPage(), this.pageSize());
    }

    request$
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: (response: PageResponse<AdminAuditLog>) => {
          this.logs.set(response.content);
          this.totalElements.set(response.totalElements);
          this.totalPages.set(response.totalPages);
        },
        error: (error) => {
          this.logger.error('Errore nel caricamento dei log', error);
          this.hasError.set(true);
          this.toastService.error('Errore nel caricamento dei log');
        },
      });
  }

  /**
   * Applica i filtri
   */
  applyFilters(): void {
    this.currentPage.set(0);
    this.loadLogs();
  }

  /**
   * Reset filtri
   */
  resetFilters(): void {
    this.filterAction.set('');
    this.filterAdmin.set('');
    this.currentPage.set(0);
    this.loadLogs();
  }

  /**
   * Toggle visibilità filtri
   */
  toggleFilters(): void {
    this.showFilters.update(v => !v);
  }

  /**
   * Refresh dei log
   */
  refresh(): void {
    this.loadLogs();
  }

  /**
   * Vai alla pagina precedente
   */
  goToPrevPage(): void {
    if (this.canGoToPrevPage()) {
      this.currentPage.update(p => p - 1);
      this.loadLogs();
    }
  }

  /**
   * Vai alla pagina successiva
   */
  goToNextPage(): void {
    if (this.canGoToNextPage()) {
      this.currentPage.update(p => p + 1);
      this.loadLogs();
    }
  }

  /**
   * Formatta la data
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('it-IT', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(date);
  }

  /**
   * Ottiene il colore per il tipo di azione
   */
  getActionColor(action: string): string {
    if (action.includes('ELIMINA')) return 'text-red-600 dark:text-red-400';
    if (action.includes('DISABILITA')) return 'text-orange-600 dark:text-orange-400';
    if (action.includes('ABILITA') || action.includes('PROMUOVI')) return 'text-green-600 dark:text-green-400';
    if (action.includes('RESET')) return 'text-blue-600 dark:text-blue-400';
    return 'text-gray-600 dark:text-gray-400';
  }

  /**
   * Torna indietro
   */
  goBack(): void {
    this.router.navigate(['/admin']);
  }
}
