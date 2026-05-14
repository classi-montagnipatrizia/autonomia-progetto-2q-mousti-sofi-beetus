import { Component, DestroyRef, inject, signal, computed, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  LucideAngularModule,
  ArrowLeft,
  Flag,
  Check,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Loader2,
  Clock,
} from 'lucide-angular';
import { finalize } from 'rxjs';

import { AdminService } from '../../../core/api/admin-service';
import { ToastService } from '../../../core/services/toast-service';
import { DialogService } from '../../../core/services/dialog-service';
import { AvatarComponent } from '../../../shared/ui/avatar/avatar-component/avatar-component';
import { TimeAgoComponent } from '../../../shared/components/time-ago/time-ago-component/time-ago-component';
import { SegnazioneDTO, ReportReason, PageResponse } from '../../../models';

const REASON_LABELS: Record<ReportReason, string> = {
  [ReportReason.SPAM]: 'Spam',
  [ReportReason.CONTENUTO_INAPPROPRIATO]: 'Contenuto inappropriato',
  [ReportReason.BULLISMO]: 'Bullismo o molestie',
  [ReportReason.INFORMAZIONI_FALSE]: 'Informazioni false',
  [ReportReason.ALTRO]: 'Altro',
};

@Component({
  selector: 'app-segnalazioni',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,
    AvatarComponent,
    TimeAgoComponent,
  ],
  templateUrl: './segnalazioni.html',
})
export class SegnalazioniComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly adminService = inject(AdminService);
  private readonly toastService = inject(ToastService);
  private readonly dialogService = inject(DialogService);
  private readonly destroyRef = inject(DestroyRef);

  readonly ArrowLeftIcon = ArrowLeft;
  readonly FlagIcon = Flag;
  readonly CheckIcon = Check;
  readonly ChevronLeftIcon = ChevronLeft;
  readonly ChevronRightIcon = ChevronRight;
  readonly AlertCircleIcon = AlertCircle;
  readonly LoaderIcon = Loader2;
  readonly ClockIcon = Clock;

  readonly isLoading = signal(true);
  readonly hasError = signal(false);
  readonly segnalazioni = signal<SegnazioneDTO[]>([]);
  readonly processingId = signal<number | null>(null);
  readonly statusFilter = signal<string>('PENDING');
  readonly currentPage = signal(0);
  readonly totalPages = signal(0);
  readonly totalElements = signal(0);
  readonly pageSize = 20;

  readonly isFirstPage = computed(() => this.currentPage() === 0);
  readonly isLastPage = computed(() => this.currentPage() >= this.totalPages() - 1);

  ngOnInit(): void {
    this.loadSegnalazioni();
  }

  getReasonLabel(reason: ReportReason): string {
    return REASON_LABELS[reason] ?? reason;
  }

  setFilter(status: string): void {
    this.statusFilter.set(status);
    this.currentPage.set(0);
    this.loadSegnalazioni();
  }

  loadSegnalazioni(): void {
    this.isLoading.set(true);
    this.hasError.set(false);

    const status = this.statusFilter() === 'ALL' ? undefined : this.statusFilter();

    this.adminService.getSegnalazioni(status, this.currentPage(), this.pageSize)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: (page) => {
          this.segnalazioni.set(page.content);
          this.totalPages.set(page.totalPages);
          this.totalElements.set(page.totalElements);
        },
        error: () => {
          this.hasError.set(true);
          this.toastService.error('Errore nel caricamento delle segnalazioni');
        },
      });
  }

  async risolvi(s: SegnazioneDTO): Promise<void> {
    const confirmed = await this.dialogService.confirm({
      title: 'Segna come risolta',
      message: `Vuoi segnare come risolta la segnalazione di "${s.reporter.nomeCompleto}"?`,
      confirmText: 'Conferma',
      cancelText: 'Annulla',
    });
    if (!confirmed) return;

    this.processingId.set(s.id);
    this.adminService.risolviSegnalazione(s.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.processingId.set(null))
      )
      .subscribe({
        next: (updated) => {
          this.segnalazioni.update(list =>
            list.map(item => item.id === updated.id ? updated : item)
          );
          // Se stiamo filtrando per PENDING, rimuovila dalla lista
          if (this.statusFilter() === 'PENDING') {
            this.segnalazioni.update(list => list.filter(item => item.id !== updated.id));
            this.totalElements.update(n => n - 1);
          }
          this.toastService.success('Segnalazione risolta');
        },
        error: () => this.toastService.error('Errore durante la risoluzione'),
      });
  }

  navigateTo(s: SegnazioneDTO): void {
    if (s.targetType === 'POST') {
      this.router.navigate(['/post', s.targetId]);
    } else if (s.targetType === 'COMMENT' && s.postId != null) {
      this.router.navigate(['/post', s.postId], { fragment: 'comments' });
    }
  }

  previousPage(): void {
    if (!this.isFirstPage()) {
      this.currentPage.update(p => p - 1);
      this.loadSegnalazioni();
    }
  }

  nextPage(): void {
    if (!this.isLastPage()) {
      this.currentPage.update(p => p + 1);
      this.loadSegnalazioni();
    }
  }

  goBack(): void {
    this.router.navigate(['/admin']);
  }
}
