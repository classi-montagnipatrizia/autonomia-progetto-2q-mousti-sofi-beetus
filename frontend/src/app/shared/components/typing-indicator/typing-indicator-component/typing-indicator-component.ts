import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Dimensioni dell'indicatore
 */
export type TypingIndicatorSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-typing-indicator-component',
  imports: [CommonModule],
  templateUrl: './typing-indicator-component.html',
  styleUrl: './typing-indicator-component.scss',
})
export class TypingIndicatorComponent {
/**
   * Nome dell'utente che sta scrivendo
   * Se fornito, mostra "Username sta scrivendo..."
   */
  readonly username = input<string>('');

  /**
   * Mostra il testo descrittivo
   * @default true
   */
  readonly showText = input<boolean>(true);

  /**
   * Dimensione dell'indicatore
   * @default 'md'
   */
  readonly size = input<TypingIndicatorSize>('md');

  /**
   * Variante scura (per sfondi chiari)
   * @default false
   */
  readonly dark = input<boolean>(false);

  /**
   * Testo da mostrare
   */
  readonly displayText = computed(() => {
    const name = this.username();
    if (!name) return 'sta scrivendo';
    return `${name} sta scrivendo`;
  });

  /**
   * Classi CSS per i pallini
   */
  readonly dotClasses = computed(() => {
    const sizeMap: Record<TypingIndicatorSize, string> = {
      sm: 'w-1.5 h-1.5',
      md: 'w-2 h-2',
      lg: 'w-2.5 h-2.5',
    };

    const colorClass = this.dark()
      ? 'bg-gray-600 dark:bg-gray-400'
      : 'bg-gray-400 dark:bg-gray-500';

    return `${sizeMap[this.size()]} ${colorClass} rounded-full`;
  });

  /**
   * Classi CSS per il testo
   */
  readonly textClasses = computed(() => {
    const sizeMap: Record<TypingIndicatorSize, string> = {
      sm: 'text-xs',
      md: 'text-sm',
      lg: 'text-base',
    };

    const colorClass = this.dark()
      ? 'text-gray-600 dark:text-gray-400'
      : 'text-gray-500 dark:text-gray-400';

    return `${sizeMap[this.size()]} ${colorClass}`;
  });

  /**
   * Classi CSS per il gap tra pallini
   */
  readonly containerGapClass = computed(() => {
    const gapMap: Record<TypingIndicatorSize, string> = {
      sm: 'gap-0.5',
      md: 'gap-1',
      lg: 'gap-1.5',
    };
    return gapMap[this.size()];
  });
}
