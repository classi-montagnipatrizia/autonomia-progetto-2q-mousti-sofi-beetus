import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  LucideAngularModule,
  ArrowLeft,
  Activity,
  RefreshCw,
  Trash2,
  Search,
  CircleAlert,
  LoaderCircle,
  Shield,
  Info,
} from 'lucide-angular';
import { Subject, takeUntil, finalize } from 'rxjs';

import { AdminService, RateLimitType, UserTokensResponse, RateLimitStatsResponse } from '../../../../core/api/admin-service';
import { ToastService } from '../../../../core/services/toast-service';
import { DialogService } from '../../../../core/services/dialog-service';
import { ButtonComponent } from '../../../../shared/ui/button/button-component/button-component';
import { LoggerService } from '../../../../core/services/logger.service';

@Component({
  selector: 'app-rate-limit-component',
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    ButtonComponent,
  ],
  templateUrl: './rate-limit-component.html',
  styleUrl: './rate-limit-component.scss',
})
export class RateLimitComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly adminService = inject(AdminService);
  private readonly toastService = inject(ToastService);
  private readonly dialogService = inject(DialogService);
  private readonly destroy$ = new Subject<void>();
  private readonly logger = inject(LoggerService);

  // Icone
  readonly ArrowLeftIcon = ArrowLeft;
  readonly ActivityIcon = Activity;
  readonly RefreshIcon = RefreshCw;
  readonly Trash2Icon = Trash2;
  readonly SearchIcon = Search;
  readonly AlertCircleIcon = CircleAlert;
  readonly Loader2Icon = LoaderCircle;
  readonly ShieldIcon = Shield;
  readonly InfoIcon = Info;

  // Stato
  readonly stats = signal<RateLimitStatsResponse | null>(null);
  readonly isLoadingStats = signal(false);
  readonly hasStatsError = signal(false);

  // Reset utente
  readonly username = signal('');
  readonly selectedType = signal<RateLimitType>('API_GENERAL');
  readonly isResettingUser = signal(false);

  // Check tokens
  readonly checkUsername = signal('');
  readonly checkType = signal<RateLimitType>('API_GENERAL');
  readonly tokenInfo = signal<UserTokensResponse | null>(null);
  readonly isCheckingTokens = signal(false);

  // Tipi disponibili
  readonly rateLimitTypes: RateLimitType[] = [
    'AUTH',
    'POST_CREATION',
    'LIKE',
    'MESSAGE',
    'API_GENERAL',
    'WEBSOCKET',
  ];

  ngOnInit(): void {
    this.loadStats();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Carica statistiche rate limit
   */
  loadStats(): void {
    this.isLoadingStats.set(true);
    this.hasStatsError.set(false);

    this.adminService.getRateLimitStats()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoadingStats.set(false))
      )
      .subscribe({
        next: (data) => {
          this.stats.set(data);
        },
        error: (error) => {
          this.logger.error('Errore nel caricamento delle statistiche', error);
          this.hasStatsError.set(true);
          this.toastService.error('Errore nel caricamento delle statistiche');
        },
      });
  }

  /**
   * Reset rate limit per utente
   */
  async resetUserRateLimit(): Promise<void> {
    const user = this.username().trim();
    if (!user) {
      this.toastService.error('Inserisci un username');
      return;
    }

    const confirmed = await this.dialogService.confirm({
      title: 'Conferma reset',
      message: `Vuoi resettare il rate limit ${this.selectedType()} per l'utente ${user}?`,
    });

    if (!confirmed) return;

    this.isResettingUser.set(true);
    this.adminService.resetUserRateLimit(user, this.selectedType())
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isResettingUser.set(false))
      )
      .subscribe({
        next: (response) => {
          this.toastService.success(response.message || 'Rate limit resettato');
          this.username.set('');
          this.loadStats();
        },
        error: (error) => {
          this.logger.error('Errore nel reset', error);
          this.toastService.error(error.error?.message || 'Errore nel reset del rate limit');
        },
      });
  }

  /**
   * Controlla token disponibili per un utente
   */
  checkUserTokens(): void {
    const user = this.checkUsername().trim();
    if (!user) {
      this.toastService.error('Inserisci un username');
      return;
    }

    this.isCheckingTokens.set(true);
    this.adminService.getUserRateLimitTokens(user, this.checkType())
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isCheckingTokens.set(false))
      )
      .subscribe({
        next: (data) => {
          this.tokenInfo.set(data);
        },
        error: (error) => {
          this.logger.error('Errore nel controllo token', error);
          this.toastService.error(error.error?.message || 'Errore nel controllo dei token');
          this.tokenInfo.set(null);
        },
      });
  }

  /**
   * Torna indietro
   */
  goBack(): void {
    this.router.navigate(['/admin']);
  }
}
