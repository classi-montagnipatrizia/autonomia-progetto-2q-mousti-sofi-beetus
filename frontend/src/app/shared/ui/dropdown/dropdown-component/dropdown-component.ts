import { Component, input, signal, computed, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Posizionamento del menu dropdown
 */
export type DropdownPlacement = 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';

@Component({
  selector: 'app-dropdown',
  imports: [CommonModule],
  templateUrl: './dropdown-component.html',
  styleUrl: './dropdown-component.scss',
 
})
export class DropdownComponent {
  /**
   * Posizionamento del menu dropdown
   * @default 'bottom-start'
   */
  readonly placement = input<DropdownPlacement>('bottom-start');

  /**
   * Larghezza minima del dropdown (in rem)
   * @default 12 (192px)
   */
  readonly minWidth = input<number>(12);

  /**
   * Mostra una freccia che punta al trigger
   * @default false
   */
  readonly showArrow = input<boolean>(false);

  /**
   * Controlla se il dropdown è aperto
   */
  readonly isOpen = signal<boolean>(false);

  /**
   * Classi CSS per il posizionamento del dropdown
   */
  readonly placementClasses = computed(() => {
    const placement = this.placement();

    const placementMap: Record<DropdownPlacement, string> = {
      'bottom-start': 'top-full left-0 mt-2',
      'bottom-end': 'top-full right-0 mt-2',
      'top-start': 'bottom-full left-0 mb-2',
      'top-end': 'bottom-full right-0 mb-2',
    };

    return placementMap[placement];
  });

  /**
   * Stile inline per la larghezza minima
   */
  readonly minWidthStyle = computed(() => {
    return `${this.minWidth()}rem`;
  });

  constructor(private readonly elementRef: ElementRef) {}

  /**
   * Chiude il dropdown quando si clicca fuori
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.isOpen()) return;

    const clickedInside = this.elementRef.nativeElement.contains(event.target);

    if (!clickedInside) {
      this.close();
    }
  }

  /**
   * Gestisce la pressione del tasto Escape per chiudere
   */
  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.isOpen()) {
      this.close();
    }
  }

  /**
   * Apre il dropdown
   */
  open(): void {
    this.isOpen.set(true);
  }

  /**
   * Chiude il dropdown
   */
  close(): void {
    this.isOpen.set(false);
  }

  /**
   * Toggle del dropdown (apri/chiudi)
   */
  toggle(): void {
    this.isOpen.update((value) => !value);
  }
}
