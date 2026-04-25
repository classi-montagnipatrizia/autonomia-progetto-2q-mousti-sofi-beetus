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
    const base = 'p-5 rounded-[24px] shadow-xl shadow-black/5 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border backdrop-blur-xl';

    switch (type) {
      case 'success':
        return `${base} bg-success-50/80 dark:bg-success-900/30 border-success-200/50 dark:border-success-700/30 text-success-800 dark:text-success-100 ring-1 ring-inset ring-white/20`;

      case 'error':
        return `${base} bg-error-50/80 dark:bg-error-900/30 border-error-200/50 dark:border-error-700/30 text-error-800 dark:text-error-100 ring-1 ring-inset ring-white/20`;

      case 'warning':
        return `${base} bg-warning-50/80 dark:bg-warning-900/30 border-warning-200/50 dark:border-warning-700/30 text-warning-800 dark:text-warning-100 ring-1 ring-inset ring-white/20`;

      case 'info':
        return `${base} bg-info-50/80 dark:bg-info-900/30 border-info-200/50 dark:border-info-700/30 text-info-800 dark:text-info-100 ring-1 ring-inset ring-white/20`;

      default:
        return base;
    }
  }

  /**
   * Restituisce le classi CSS per l'icona
   */
  getIconClasses(type: ToastType): string {
    const base = 'shrink-0 transition-colors';

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
