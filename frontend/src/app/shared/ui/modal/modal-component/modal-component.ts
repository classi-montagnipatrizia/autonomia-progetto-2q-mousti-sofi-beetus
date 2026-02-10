import {
  Component,
  input,
  output,
  viewChild,
  effect,
  ElementRef,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, X } from 'lucide-angular';

/**
 * Dimensioni del modal
 */
export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

@Component({
  selector: 'app-modal-component',
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './modal-component.html',
  styleUrl: './modal-component.scss',
})
export class ModalComponent {
// Icona X per chiusura
  readonly X = X;

  // Riferimento al dialog nativo
  readonly dialogElement = viewChild<ElementRef<HTMLDialogElement>>('dialogElement');

  /**
   * Controlla apertura/chiusura del modal
   */
  readonly isOpen = input<boolean>(false);

  /**
   * Titolo del modal (opzionale, usa slot per header custom)
   */
  readonly title = input<string>('');

  /**
   * Dimensione del modal
   * @default 'md'
   */
  readonly size = input<ModalSize>('md');

  /**
   * Mostra pulsante X per chiudere
   * @default true
   */
  readonly showCloseButton = input<boolean>(true);

  /**
   * Chiudi cliccando sull'overlay
   * @default true
   */
  readonly closeOnOverlayClick = input<boolean>(true);

  /**
   * Chiudi premendo ESC
   * @default true
   */
  readonly closeOnEsc = input<boolean>(true);

  /**
   * Evento emesso quando il modal viene chiuso
   */
  readonly closed = output<void>();

  constructor() {
    // Gestisce apertura/chiusura del dialog nativo
    effect(() => {
      const dialogRef = this.dialogElement();
      const dialog = dialogRef?.nativeElement;

      if (!dialog) return;

      if (this.isOpen()) {
        dialog.showModal();
      } else if (dialog.open) {
        dialog.close();
      }
    });
  }

  /**
   * Classi CSS per la dimensione
   */
  readonly sizeClasses = computed(() => {
    const size = this.size();

    const sizeMap: Record<ModalSize, string> = {
      sm: 'max-w-sm',
      md: 'max-w-lg',
      lg: 'max-w-2xl',
      xl: 'max-w-4xl',
      full: 'max-w-[calc(100%-2rem)] max-h-[calc(100%-2rem)]',
    };

    return sizeMap[size];
  });

  /**
   * Chiude il modal
   */
  close(): void {
    this.closed.emit();
  }

  /**
   * Handler click sull'overlay
   */
  onOverlayClick(event: MouseEvent): void {
    const dialog = this.dialogElement()?.nativeElement;
    if (this.closeOnOverlayClick() && event.target === dialog) {
      this.close();
    }
  }

  /**
   * Handler evento cancel (ESC)
   */
  onCancel(event: Event): void {
    if (this.closeOnEsc()) {
      this.close();
    } else {
      event.preventDefault();
    }
  }
}
