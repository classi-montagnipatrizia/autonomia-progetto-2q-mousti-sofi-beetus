import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Varianti di colore del badge
 */
export type BadgeVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';

/**
 * Dimensioni del badge
 */
export type BadgeSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-badge-component',
  imports: [CommonModule],
  templateUrl: './badge-component.html',
  styleUrl: './badge-component.scss',
})
export class BadgeComponent {
/**
   * Variante di colore
   * @default 'primary'
   */
  readonly variant = input<BadgeVariant>('primary');

  /**
   * Dimensione del badge
   * @default 'md'
   */
  readonly size = input<BadgeSize>('md');

  /**
   * Mostra solo un pallino senza testo
   * @default false
   */
  readonly dot = input<boolean>(false);

  /**
   * Forma pill (più arrotondata)
   * @default false
   */
  readonly pill = input<boolean>(false);

  /**
   * Variante outline (solo bordo, sfondo trasparente)
   * @default false
   */
  readonly outline = input<boolean>(false);

  /**
   * Classi CSS per la variante (sfondo pieno)
   */
  readonly variantClasses = computed(() => {
    const variant = this.variant();
    const isOutline = this.outline();

    if (isOutline) {
      const outlineMap: Record<BadgeVariant, string> = {
        primary: 'bg-transparent border border-primary-500 text-primary-600 dark:text-primary-400',
        secondary: 'bg-transparent border border-gray-400 text-gray-600 dark:border-gray-500 dark:text-gray-300',
        success: 'bg-transparent border border-success-500 text-success-600 dark:text-success-400',
        warning: 'bg-transparent border border-warning-500 text-warning-600 dark:text-warning-400',
        error: 'bg-transparent border border-error-500 text-error-600 dark:text-error-400',
        info: 'bg-transparent border border-info-500 text-info-600 dark:text-info-400',
      };
      return outlineMap[variant];
    }

    const solidMap: Record<BadgeVariant, string> = {
      primary: 'bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300',
      secondary: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
      success: 'bg-success-100 text-success-700 dark:bg-success-900/50 dark:text-success-300',
      warning: 'bg-warning-100 text-warning-700 dark:bg-warning-900/50 dark:text-warning-300',
      error: 'bg-error-100 text-error-700 dark:bg-error-900/50 dark:text-error-300',
      info: 'bg-info-100 text-info-700 dark:bg-info-900/50 dark:text-info-300',
    };

    return solidMap[variant];
  });

  /**
   * Classi CSS per la dimensione
   */
  readonly sizeClasses = computed(() => {
    const size = this.size();
    const isDot = this.dot();

    // Dimensioni per dot badge
    if (isDot) {
      const dotSizeMap: Record<BadgeSize, string> = {
        sm: 'w-2 h-2',
        md: 'w-2.5 h-2.5',
        lg: 'w-3 h-3',
      };
      return dotSizeMap[size];
    }

    // Dimensioni per badge con testo
    const sizeMap: Record<BadgeSize, string> = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-2.5 py-0.5 text-sm',
      lg: 'px-3 py-1 text-base',
    };

    return sizeMap[size];
  });

  /**
   * Classi CSS per il border-radius
   */
  readonly radiusClasses = computed(() => {
    if (this.dot()) {
      return 'rounded-full';
    }
    return this.pill() ? 'rounded-full' : 'rounded-md';
  });

  /**
   * Classi CSS complete del badge
   */
  readonly badgeClasses = computed(() => {
    const base = 'inline-flex items-center justify-center font-medium whitespace-nowrap';

    return `${base} ${this.variantClasses()} ${this.sizeClasses()} ${this.radiusClasses()}`;
  });

  /**
   * Colore del dot badge (sfondo pieno)
   */
  readonly dotColorClasses = computed(() => {
    const variant = this.variant();

    const dotColorMap: Record<BadgeVariant, string> = {
      primary: 'bg-primary-500',
      secondary: 'bg-gray-500',
      success: 'bg-success-500',
      warning: 'bg-warning-500',
      error: 'bg-error-500',
      info: 'bg-info-500',
    };

    return dotColorMap[variant];
  });

  /**
   * Classi CSS per dot badge
   */
  readonly dotClasses = computed(() => {
    const base = 'rounded-full';
    return `${base} ${this.sizeClasses()} ${this.dotColorClasses()}`;
  });
}
