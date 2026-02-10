import { Directive, output, input, HostListener } from '@angular/core';

/**
 * Direttiva per prevenire click multipli rapidi (debounce)
 *
 * Utilizzo:
 * <button appDebounceClick (debounceClick)="submit()">Invia</button>
 * <button appDebounceClick [debounceTime]="500" (debounceClick)="submit()">Invia</button>
 */
@Directive({
  selector: '[appDebounceClick]',
  standalone: true,
})
export class DebounceClick {
  /**
   * Tempo di debounce in millisecondi
   * @default 300
   */
  readonly debounceTime = input<number>(300);

  /**
   * Evento emesso dopo il debounce
   */
  readonly debounceClick = output<MouseEvent>();

  private lastClickTime = 0;

  @HostListener('click', ['$event'])
  onClick(event: MouseEvent): void {
    const now = Date.now();

    // Ignora se è passato meno tempo del debounce
    if (now - this.lastClickTime < this.debounceTime()) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    this.lastClickTime = now;
    this.debounceClick.emit(event);
  }
}
