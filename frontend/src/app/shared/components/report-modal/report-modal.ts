import { Component, input, output, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Flag } from 'lucide-angular';
import { finalize } from 'rxjs';

import { ModalComponent } from '../../ui/modal/modal-component/modal-component';
import { ButtonComponent } from '../../ui/button/button-component/button-component';
import { ReportService } from '../../../core/api/report-service';
import { ToastService } from '../../../core/services/toast-service';
import { ReportReason } from '../../../models';

interface ReasonOption {
  value: ReportReason;
  label: string;
}

@Component({
  selector: 'app-report-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, ModalComponent, ButtonComponent],
  template: `
    <app-modal-component
      [isOpen]="isOpen()"
      title="Segnala contenuto"
      size="sm"
      (closed)="close()"
    >
      <div class="space-y-4">
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Seleziona il motivo della segnalazione. La segnalazione sarà inviata all'amministratore.
        </p>

        <div class="space-y-2">
          @for (option of reasons; track option.value) {
            <label class="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                   [class.border-primary-500]="selectedReason() === option.value"
                   [class.bg-primary-50]="selectedReason() === option.value"
                   [class.dark:bg-primary-900/20]="selectedReason() === option.value">
              <input
                type="radio"
                name="reason"
                [value]="option.value"
                [checked]="selectedReason() === option.value"
                (change)="selectedReason.set(option.value)"
                class="accent-primary-500"
              />
              <span class="text-sm font-medium text-gray-800 dark:text-gray-200">{{ option.label }}</span>
            </label>
          }
        </div>

        @if (selectedReason() === ReportReason.ALTRO) {
          <textarea
            [(ngModel)]="customReason"
            placeholder="Descrivi il problema..."
            maxlength="500"
            rows="3"
            class="w-full p-3 text-sm text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
          ></textarea>
        }
      </div>

      <div modal-footer class="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          class="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
          (click)="close()"
          [disabled]="isLoading()"
        >
          Annulla
        </button>
        <app-button
          variant="primary"
          [disabled]="!canSubmit()"
          [loading]="isLoading()"
          (clicked)="submit()"
        >
          Invia segnalazione
        </app-button>
      </div>
    </app-modal-component>
  `,
})
export class ReportModalComponent {
  private readonly reportService = inject(ReportService);
  private readonly toastService = inject(ToastService);

  readonly FlagIcon = Flag;
  readonly ReportReason = ReportReason;

  readonly isOpen = input.required<boolean>();
  readonly targetType = input.required<'POST' | 'COMMENT'>();
  readonly targetId = input.required<number>();

  readonly closed = output<void>();
  readonly submitted = output<void>();

  readonly selectedReason = signal<ReportReason | null>(null);
  readonly isLoading = signal(false);
  customReason = '';

  readonly reasons: ReasonOption[] = [
    { value: ReportReason.SPAM, label: 'Spam' },
    { value: ReportReason.CONTENUTO_INAPPROPRIATO, label: 'Contenuto inappropriato' },
    { value: ReportReason.BULLISMO, label: 'Bullismo o molestie' },
    { value: ReportReason.INFORMAZIONI_FALSE, label: 'Informazioni false' },
    { value: ReportReason.ALTRO, label: 'Altro' },
  ];

  readonly canSubmit = computed(() => {
    const reason = this.selectedReason();
    if (!reason) return false;
    if (reason === ReportReason.ALTRO && !this.customReason.trim()) return false;
    return true;
  });

  close(): void {
    this.selectedReason.set(null);
    this.customReason = '';
    this.closed.emit();
  }

  submit(): void {
    const reason = this.selectedReason();
    if (!reason) return;

    this.isLoading.set(true);
    this.reportService.segnala({
      targetType: this.targetType(),
      targetId: this.targetId(),
      reason,
      customReason: reason === ReportReason.ALTRO ? this.customReason.trim() : undefined,
    }).pipe(
      finalize(() => this.isLoading.set(false))
    ).subscribe({
      next: () => {
        this.toastService.success('Segnalazione inviata');
        this.close();
        this.submitted.emit();
      },
      error: (err) => {
        const msg = err?.error?.message ?? 'Errore durante la segnalazione';
        this.toastService.error(msg);
      },
    });
  }
}
