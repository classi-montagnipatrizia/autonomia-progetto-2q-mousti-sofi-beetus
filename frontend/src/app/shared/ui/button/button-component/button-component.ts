import { Component, input, computed, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, LoaderCircle, LucideIconData } from 'lucide-angular';

/**
 * Varianti di stile del pulsante
 */
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

/**
 * Dimensioni del pulsante
 */
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * Tipo di pulsante HTML
 */
export type ButtonType = 'button' | 'submit' | 'reset';

@Component({
  selector: 'app-button',
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './button-component.html',
  styleUrl: './button-component.scss',
})
export class ButtonComponent {
  // Icona Lucide per loading
  readonly LoaderCircle = LoaderCircle;

  /**
   * Variante di stile del pulsante
   * @default 'primary'
   */
  readonly variant = input<ButtonVariant>('primary');

  /**
   * Dimensione del pulsante
   * @default 'md'
   */
  readonly size = input<ButtonSize>('md');

  /**
   * Tipo HTML del button
   * @default 'button'
   */
  readonly type = input<ButtonType>('button');

  /**
   * Disabilita il pulsante
   * @default false
   */
  readonly disabled = input<boolean>(false);

  /**
   * Mostra stato loading con spinner
   * @default false
   */
  readonly loading = input<boolean>(false);

  /**
   * Pulsante full width (occupa tutta la larghezza del contenitore)
   * @default false
   */
  readonly fullWidth = input<boolean>(false);

  /**
   * Icona a sinistra del testo (LucideIconData)
   */
  readonly iconLeft = input<LucideIconData | undefined>(undefined);

  /**
   * Icona a destra del testo (LucideIconData)
   */
  readonly iconRight = input<LucideIconData | undefined>(undefined);

  /**
   * Evento emesso al click
   */
  readonly clicked = output<MouseEvent>();

  /**
   * Classi CSS per la variante
   */
  readonly variantClasses = computed(() => {
    const variant = this.variant();

    const variantMap: Record<ButtonVariant, string> = {
      primary:
        'bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700 disabled:bg-primary-300 dark:disabled:bg-primary-800',
      secondary:
        'bg-gray-200 text-gray-900 hover:bg-gray-300 active:bg-gray-400 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600 dark:active:bg-gray-500',
      outline:
        'bg-transparent border-2 border-primary-500 text-primary-500 hover:bg-primary-50 active:bg-primary-100 dark:hover:bg-primary-900/20 dark:active:bg-primary-900/40',
      ghost:
        'bg-transparent text-gray-700 hover:bg-gray-100 active:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-800 dark:active:bg-gray-700',
      danger:
        'bg-error-500 text-white hover:bg-error-600 active:bg-error-700 disabled:bg-error-300 dark:disabled:bg-error-800',
    };

    return variantMap[variant];
  });

  /**
   * Classi CSS per la dimensione
   */
  readonly sizeClasses = computed(() => {
    const size = this.size();

    const sizeMap: Record<ButtonSize, string> = {
      sm: 'h-9 px-5 text-sm',
      md: 'h-10 px-6 text-base',
      lg: 'h-12 px-8 text-lg',
    };

    return sizeMap[size];
  });

  /**
   * Classi CSS complete del pulsante
   */
  readonly buttonClasses = computed(() => {
    const baseClasses =
      'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 whitespace-nowrap';

    const fullWidthClass = this.fullWidth() ? 'w-full' : '';

    return `${baseClasses} ${this.variantClasses()} ${this.sizeClasses()} ${fullWidthClass}`;
  });

  /**
   * Verifica se il pulsante è disabilitato (disabled o loading)
   */
  readonly isDisabled = computed(() => {
    return this.disabled() || this.loading();
  });

  /**
   * Handler del click
   */
  onClick(event: MouseEvent): void {
    if (!this.isDisabled()) {
      this.clicked.emit(event);
    }
  }
}
