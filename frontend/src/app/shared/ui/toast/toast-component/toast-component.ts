import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { LucideAngularModule, CircleCheck, CircleX, TriangleAlert, Info, X } from 'lucide-angular';
import { ToastService } from '../../../../core/services/toast-service';
import { ToastType } from '../../../../models/toast.model';

@Component({
  selector: 'app-toast-component',
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './toast-component.html',
  styleUrl: './toast-component.scss',
})
export class ToastComponent {
  private readonly toastService = inject(ToastService);

  // Signals
  readonly toasts = this.toastService.toasts;

  // Icone
  readonly CircleCheck = CircleCheck;
  readonly CircleX = CircleX;
  readonly TriangleAlert = TriangleAlert;
  readonly Info = Info;
  readonly X = X;

  /**
   * Chiude un toast specifico
   */
  dismiss(id: string): void {
    this.toastService.dismiss(id);
  }

  /**
   * Restituisce le classi CSS per il tipo di toast
   */
  getToastClasses(type: ToastType): string {
    const base = 'flex items-start gap-3 p-4 rounded-lg shadow-lg border backdrop-blur-sm';

    switch (type) {
      case 'success':
        return `${base} bg-success-50 dark:bg-success-900/20 border-success-200 dark:border-success-800 text-success-800 dark:text-success-200`;

      case 'error':
        return `${base} bg-error-50 dark:bg-error-900/20 border-error-200 dark:border-error-800 text-error-800 dark:text-error-200`;

      case 'warning':
        return `${base} bg-warning-50 dark:bg-warning-900/20 border-warning-200 dark:border-warning-800 text-warning-800 dark:text-warning-200`;

      case 'info':
        return `${base} bg-info-50 dark:bg-info-900/20 border-info-200 dark:border-info-800 text-info-800 dark:text-info-200`;

      default:
        return base;
    }
  }

  /**
   * Restituisce le classi CSS per l'icona
   */
  getIconClasses(type: ToastType): string {
    const base = 'shrink-0';

    switch (type) {
      case 'success':
        return `${base} text-success-600 dark:text-success-400`;

      case 'error':
        return `${base} text-error-600 dark:text-error-400`;

      case 'warning':
        return `${base} text-warning-600 dark:text-warning-400`;

      case 'info':
        return `${base} text-info-600 dark:text-info-400`;

      default:
        return base;
    }
  }

  /**
   * Restituisce l'icona appropriata per il tipo
   */
  getIcon(type: ToastType) {
    switch (type) {
      case 'success':
        return this.CircleCheck;
      case 'error':
        return this.CircleX;
      case 'warning':
        return this.TriangleAlert;
      case 'info':
        return this.Info;
      default:
        return this.Info;
    }
  }
}
