import { Component, inject, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  LucideAngularModule,
  ArrowLeft,
  Database,
  Trash2,
  TriangleAlert,
  CircleCheck,
  LoaderCircle,
  Info,
} from 'lucide-angular';
import { Subject, takeUntil, finalize } from 'rxjs';

import { AdminService, CleanupResponse } from '../../../../core/api/admin-service';
import { ToastService } from '../../../../core/services/toast-service';
import { DialogService } from '../../../../core/services/dialog-service';
import { ButtonComponent } from '../../../../shared/ui/button/button-component/button-component';
import { LoggerService } from '../../../../core/services/logger.service';

@Component({
  selector: 'app-system-maintenance-component',
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    ButtonComponent,
  ],
  templateUrl: './system-maintenance-component.html',
  styleUrl: './system-maintenance-component.scss',
})
export class SystemMaintenanceComponent implements OnDestroy {
  private readonly router = inject(Router);
  private readonly adminService = inject(AdminService);
  private readonly toastService = inject(ToastService);
  private readonly dialogService = inject(DialogService);
  private readonly destroy$ = new Subject<void>();
  private readonly logger = inject(LoggerService);

  // Icone
  readonly ArrowLeftIcon = ArrowLeft;
  readonly DatabaseIcon = Database;
  readonly Trash2Icon = Trash2;
  readonly AlertTriangleIcon = TriangleAlert;
  readonly CheckCircleIcon = CircleCheck;
  readonly Loader2Icon = LoaderCircle;
  readonly InfoIcon = Info;

  // Stato
  readonly giorni = signal(90);
  readonly isCleaningUp = signal(false);
  readonly cleanupResult = signal<CleanupResponse | null>(null);

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Esegue la pulizia del database
   */
  async cleanupDatabase(): Promise<void> {
    const days = this.giorni();
    
    const confirmed = await this.dialogService.confirmDangerous({
      title: 'Conferma pulizia database',
      message: `Questa operazione eliminerà tutti i dati obsoleti più vecchi di ${days} giorni. L'operazione non può essere annullata. Continuare?`,
    });

    if (!confirmed) return;

    this.isCleaningUp.set(true);
    this.cleanupResult.set(null);

    this.adminService.cleanupDatabase(days)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isCleaningUp.set(false))
      )
      .subscribe({
        next: (response) => {
          this.cleanupResult.set(response);
          this.toastService.success(response.message || 'Pulizia completata con successo');
        },
        error: (error) => {
          this.logger.error('Errore nella pulizia', error);
          this.toastService.error(error.error?.message || 'Errore durante la pulizia del database');
        },
      });
  }

  /**
   * Ottiene le chiavi dei risultati
   */
  getResultKeys(): string[] {
    const result = this.cleanupResult();
    return result?.risultati ? Object.keys(result.risultati) : [];
  }

  /**
   * Ottiene il valore per una chiave
   */
  getResultValue(key: string): number {
    const result = this.cleanupResult();
    return result?.risultati[key] || 0;
  }

  /**
   * Formatta la chiave per la visualizzazione
   */
  formatKey(key: string): string {
    return key.replaceAll('_', ' ').toLowerCase()
      .replace(/^\w/, c => c.toUpperCase());
  }

  /**
   * Torna indietro
   */
  goBack(): void {
    this.router.navigate(['/admin']);
  }
}
