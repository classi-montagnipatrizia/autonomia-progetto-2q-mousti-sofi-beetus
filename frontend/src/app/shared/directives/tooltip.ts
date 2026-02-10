import {
  Directive,
  ElementRef,
  inject,
  input,
  HostListener,
  Renderer2,
  OnDestroy,
} from '@angular/core';

/**
 * Posizione del tooltip
 */
export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

/**
 * Direttiva per mostrare tooltip su hover
 *
 * Utilizzo:
 * <button appTooltip="Salva documento">💾</button>
 * <button appTooltip="Elimina" tooltipPosition="bottom">🗑️</button>
 */
@Directive({
  selector: '[appTooltip]',
  standalone: true,
})
export class Tooltip implements OnDestroy {
  private readonly el = inject(ElementRef);
  private readonly renderer = inject(Renderer2);

  /**
   * Testo del tooltip
   */
  readonly appTooltip = input.required<string>();

  /**
   * Posizione del tooltip
   * @default 'top'
   */
  readonly tooltipPosition = input<TooltipPosition>('top');

  /**
   * Delay prima di mostrare il tooltip (ms)
   * @default 200
   */
  readonly tooltipDelay = input<number>(200);

  private tooltipElement: HTMLElement | null = null;
  private showTimeout: ReturnType<typeof setTimeout> | null = null;

  @HostListener('mouseenter')
  onMouseEnter(): void {
    this.showTimeout = setTimeout(() => {
      this.show();
    }, this.tooltipDelay());
  }

  @HostListener('mouseleave')
  onMouseLeave(): void {
    this.hide();
  }

  @HostListener('click')
  onClick(): void {
    this.hide();
  }

  ngOnDestroy(): void {
    this.hide();
  }

  /**
   * Mostra il tooltip
   */
  private show(): void {
    if (this.tooltipElement || !this.appTooltip()) return;

    // Crea elemento tooltip
    this.tooltipElement = this.renderer.createElement('div');
    this.renderer.appendChild(document.body, this.tooltipElement);

    // Contenuto
    if (this.tooltipElement) this.tooltipElement.textContent = this.appTooltip();

    // Classi base
    this.renderer.addClass(this.tooltipElement, 'tooltip');
    this.renderer.setStyle(this.tooltipElement, 'position', 'fixed');
    this.renderer.setStyle(this.tooltipElement, 'z-index', '9999');
    this.renderer.setStyle(this.tooltipElement, 'padding', '0.5rem 0.75rem');
    this.renderer.setStyle(this.tooltipElement, 'font-size', '0.875rem');
    this.renderer.setStyle(this.tooltipElement, 'font-weight', '500');
    this.renderer.setStyle(this.tooltipElement, 'color', 'white');
    this.renderer.setStyle(this.tooltipElement, 'background-color', 'rgb(31, 41, 55)');
    this.renderer.setStyle(this.tooltipElement, 'border-radius', '0.5rem');
    this.renderer.setStyle(this.tooltipElement, 'white-space', 'nowrap');
    this.renderer.setStyle(this.tooltipElement, 'pointer-events', 'none');
    this.renderer.setStyle(this.tooltipElement, 'opacity', '0');
    this.renderer.setStyle(this.tooltipElement, 'transition', 'opacity 150ms ease-out');

    // Posiziona
    this.positionTooltip();

    // Fade in
    requestAnimationFrame(() => {
      if (this.tooltipElement) {
        this.renderer.setStyle(this.tooltipElement, 'opacity', '1');
      }
    });
  }

  /**
   * Nasconde il tooltip
   */
  private hide(): void {
    if (this.showTimeout) {
      clearTimeout(this.showTimeout);
      this.showTimeout = null;
    }

    if (this.tooltipElement) {
      this.renderer.removeChild(document.body, this.tooltipElement);
      this.tooltipElement = null;
    }
  }

  /**
   * Posiziona il tooltip rispetto all'elemento
   */
  private positionTooltip(): void {
    if (!this.tooltipElement) return;

    const hostRect = this.el.nativeElement.getBoundingClientRect();
    const tooltipRect = this.tooltipElement.getBoundingClientRect();
    const gap = 8;

    let top = 0;
    let left = 0;

    switch (this.tooltipPosition()) {
      case 'top':
        top = hostRect.top - tooltipRect.height - gap;
        left = hostRect.left + (hostRect.width - tooltipRect.width) / 2;
        break;
      case 'bottom':
        top = hostRect.bottom + gap;
        left = hostRect.left + (hostRect.width - tooltipRect.width) / 2;
        break;
      case 'left':
        top = hostRect.top + (hostRect.height - tooltipRect.height) / 2;
        left = hostRect.left - tooltipRect.width - gap;
        break;
      case 'right':
        top = hostRect.top + (hostRect.height - tooltipRect.height) / 2;
        left = hostRect.right + gap;
        break;
    }

    // Mantieni dentro viewport
    const padding = 8;
    top = Math.max(padding, Math.min(top, window.innerHeight - tooltipRect.height - padding));
    left = Math.max(padding, Math.min(left, window.innerWidth - tooltipRect.width - padding));

    this.renderer.setStyle(this.tooltipElement, 'top', `${top}px`);
    this.renderer.setStyle(this.tooltipElement, 'left', `${left}px`);
  }
}
