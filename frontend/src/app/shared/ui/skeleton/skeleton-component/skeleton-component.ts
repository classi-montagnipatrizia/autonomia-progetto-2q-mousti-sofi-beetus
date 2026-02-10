import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

export type SkeletonShape = 'rectangle' | 'circle';

@Component({
  selector: 'app-skeleton',
  imports: [CommonModule],
  templateUrl: './skeleton-component.html',
  styleUrl: './skeleton-component.scss',
})
export class SkeletonComponent {
  /**
   * Width of the skeleton (e.g., '100%', '50px')
   * @default '100%'
   */
  readonly width = input<string>('100%');

  /**
   * Height of the skeleton (e.g., '20px', '1rem')
   * @default '1rem'
   */
  readonly height = input<string>('1rem');

  /**
   * Shape of the skeleton
   * @default 'rectangle'
   */
  readonly shape = input<SkeletonShape>('rectangle');

  /**
   * Additional CSS classes
   */
  readonly className = input<string>('');

  /**
   * Computed classes based on shape and custom classes
   */
  readonly classes = computed(() => {
    const baseClasses = 'animate-pulse bg-gray-200 dark:bg-gray-700';
    const shapeClass = this.shape() === 'circle' ? 'rounded-full' : 'rounded-md';

    return `${baseClasses} ${shapeClass} ${this.className()}`;
  });

  /**
   * Computed styles for width and height
   */
  readonly styles = computed(() => {
    return {
      width: this.width(),
      height: this.height(),
    };
  });
}
