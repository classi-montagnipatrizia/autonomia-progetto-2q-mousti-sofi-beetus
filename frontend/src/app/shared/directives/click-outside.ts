import { Directive, ElementRef, inject, output, HostListener } from '@angular/core';

/**
 * Direttiva per rilevare click fuori da un elemento
 *
 * Utilizzo:
 * <div appClickOutside (clickOutside)="closeDropdown()">
 *   Dropdown content
 * </div>
 */
@Directive({
  selector: '[appClickOutside]',
  standalone: true,
})
export class ClickOutside {
  private readonly el = inject(ElementRef);

  /**
   * Evento emesso quando si clicca fuori dall'elemento
   */
  readonly clickOutside = output<MouseEvent>();

  @HostListener('document:click', ['$event'])
  onClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;

    // Verifica se il click è fuori dall'elemento
    if (!this.el.nativeElement.contains(target)) {
      this.clickOutside.emit(event);
    }
  }
}
