import { Directive, ElementRef, HostListener, inject, input, AfterViewInit } from '@angular/core';

/* Direttiva per auto-ridimensionare textarea in base al contenuto
 *
 * Utilizzo:
 * <textarea appAutoResize></textarea>
 * <textarea appAutoResize [minRows]="2" [maxRows]="10"></textarea>
 */
@Directive({
  selector: '[appAutoResize]',
  standalone: true,
})
export class AutoResize implements AfterViewInit {
  private readonly el = inject(ElementRef<HTMLTextAreaElement>);

  /**
   * Numero minimo di righe
   * @default 1
   */
  readonly minRows = input<number>(1);

  /**
   * Numero massimo di righe (0 = nessun limite)
   * @default 0
   */
  readonly maxRows = input<number>(0);

  // Altezza di una singola riga (calcolata dinamicamente)
  private lineHeight = 0;

  ngAfterViewInit(): void {
    this.calculateLineHeight();
    this.resize();
  }

  @HostListener('input')
  onInput(): void {
    this.resize();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.resize();
  }

  /**
   * Calcola l'altezza di una riga
   */
  private calculateLineHeight(): void {
    const textarea = this.el.nativeElement;
    const computedStyle = globalThis.getComputedStyle(textarea);

    // Prova a ottenere line-height, altrimenti usa font-size * 1.5
    const lineHeightValue = computedStyle.lineHeight;

    if (lineHeightValue === 'normal') {
      const fontSize = Number.parseFloat(computedStyle.fontSize);
      this.lineHeight = fontSize * 1.5;
    } else {
      this.lineHeight = Number.parseFloat(lineHeightValue);
    }
  }

  /**
   * Ridimensiona la textarea
   */
  private resize(): void {
    const textarea = this.el.nativeElement;
    const computedStyle = globalThis.getComputedStyle(textarea);

    // Padding verticale e bordi
    const paddingTop = Number.parseFloat(computedStyle.paddingTop);
    const paddingBottom = Number.parseFloat(computedStyle.paddingBottom);
    const borderTop = Number.parseFloat(computedStyle.borderTopWidth);
    const borderBottom = Number.parseFloat(computedStyle.borderBottomWidth);

    const verticalPadding = paddingTop + paddingBottom + borderTop + borderBottom;

    // Calcola altezze min/max
    const minHeight = this.lineHeight * this.minRows() + verticalPadding;
    const maxHeight =
      this.maxRows() > 0 ? this.lineHeight * this.maxRows() + verticalPadding : Infinity;

    // Reset altezza per calcolare scrollHeight corretto
    textarea.style.height = 'auto';

    // Nuova altezza basata sul contenuto
    const scrollHeight = textarea.scrollHeight + borderTop + borderBottom;
    const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);

    textarea.style.height = `${newHeight}px`;

    // Gestione overflow
    // Se il contenuto supera l'altezza massima calcolata, abilita lo scroll
    if (scrollHeight > maxHeight) {
      textarea.style.overflowY = 'auto';
    } else {
      textarea.style.overflowY = 'hidden';
    }
  }
}
