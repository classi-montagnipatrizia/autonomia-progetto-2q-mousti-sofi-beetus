import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, LoaderCircle } from 'lucide-angular';

export type SpinnerSize = 'sm' | 'md' | 'lg' | 'xl';
export type SpinnerColor = 'primary' | 'white' | 'gray' | 'current';

@Component({
  selector: 'app-spinner',
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './spinner-component.html',
  styleUrl: './spinner-component.scss',
})
export class SpinnerComponent {
  readonly LoaderCircle = LoaderCircle;

  /**
   * Size of the spinner
   * @default 'md'
   */
  readonly size = input<SpinnerSize>('md');

  /**
   * Color of the spinner
   * @default 'primary'
   */
  readonly color = input<SpinnerColor>('primary');

  /**
   * Computed classes for size and color
   */
  readonly classes = computed(() => {
    const size = this.size();
    const color = this.color();

    const sizeMap: Record<SpinnerSize, string> = {
      sm: 'w-4 h-4',
      md: 'w-6 h-6',
      lg: 'w-8 h-8',
      xl: 'w-12 h-12',
    };

    const colorMap: Record<SpinnerColor, string> = {
      primary: 'text-primary-500',
      white: 'text-white',
      gray: 'text-gray-500 dark:text-gray-400',
      current: 'text-current',
    };

    return `animate-spin ${sizeMap[size]} ${colorMap[color]}`;
  });
}
