import {
  Component,
  inject,
  computed,
  effect,
  ElementRef,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../../button/button-component/button-component';
import { DialogService } from '../../../../core/services/dialog-service';

@Component({
  selector: 'app-dialog-component',
  imports: [CommonModule, ButtonComponent],
  templateUrl: './dialog-component.html',
  styleUrl: './dialog-component.scss',
})
export class DialogComponent {
 private readonly dialogService = inject(DialogService);

  // ViewChild signal-based (Angular 20)
  readonly dialogElement = viewChild<ElementRef<HTMLDialogElement>>('dialogElement');

  // Signal dal service
  readonly isOpen = this.dialogService.isOpen;

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
   * Dati del dialog corrente
   * Dipende da isOpen() per ricalcolarsi quando il dialog si apre
   */
  readonly dialogData = computed(() => {
    // Forza la dipendenza da isOpen per ricalcolare quando cambia
    if (!this.isOpen()) return null;

    const dialogRef = this.dialogService.getCurrentDialog();
    return dialogRef?.data ?? null;
  });

  /**
   * Titolo del dialog
   */
  readonly title = computed(() => this.dialogData()?.title ?? '');

  /**
   * Messaggio del dialog
   */
  readonly message = computed(() => this.dialogData()?.message ?? '');

  /**
   * Testo pulsante conferma
   */
  readonly confirmText = computed(() => this.dialogData()?.confirmText ?? 'Conferma');

  /**
   * Testo pulsante annulla
   */
  readonly cancelText = computed(() => this.dialogData()?.cancelText ?? 'Annulla');

  /**
   * Tipo di dialog (standard o dangerous)
   */
  readonly type = computed(() => this.dialogData()?.type ?? 'standard');

  /**
   * Variante del pulsante conferma in base al tipo
   */
  readonly confirmButtonVariant = computed(() => {
    return this.type() === 'dangerous' ? 'danger' : 'primary';
  });

  /**
   * Conferma l'azione
   */
  confirm(): void {
    this.dialogService.close(true);
  }

  /**
   * Annulla l'azione
   */
  cancel(): void {
    this.dialogService.close(false);
  }
}
