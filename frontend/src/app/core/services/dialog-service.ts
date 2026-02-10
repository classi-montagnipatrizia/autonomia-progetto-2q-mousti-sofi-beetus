import { Injectable, signal } from '@angular/core';
import { Subject, firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DialogService {
  // Signal per dialog aperto
  public readonly isOpen = signal<boolean>(false);

  // Riferimento al dialog corrente
  private currentDialog: DialogRef | null = null;

  /**
   * Apre un dialog di conferma standard
   *
   * Usato per azioni normali che richiedono conferma
   *
   * @param options configurazione dialog
   * @returns Promise che si risolve con true se confermato, false se annullato
   */
  async confirm(options: ConfirmDialogOptions): Promise<boolean> {
    return this.openDialog({
      ...options,
      type: 'standard',
    });
  }

  /**
   * Apre un dialog di conferma per azioni pericolose
   *
   * Usato per delete, logout, disattivazione account, etc.
   * Ha styling rosso per evidenziare il pericolo
   *
   * @param options configurazione dialog
   * @returns Promise che si risolve con true se confermato, false se annullato
   */
  async confirmDangerous(options: ConfirmDialogOptions): Promise<boolean> {
    return this.openDialog({
      ...options,
      type: 'dangerous',
    });
  }

  /**
   * Apre il dialog e attende la risposta
   */
  private async openDialog(data: DialogData): Promise<boolean> {
    // Se c'è già un dialog aperto, chiudilo
    if (this.currentDialog) {
      this.currentDialog.close(false);
    }

    this.currentDialog = new DialogRef(data);
    this.isOpen.set(true);

    // Attende la chiusura del dialog
    const result = await firstValueFrom(this.currentDialog.afterClosed());

    this.currentDialog = null;
    this.isOpen.set(false);

    return result === true;
  }

  /**
   * Ottiene i dati del dialog corrente
   * Utilizzato dal componente dialog per renderizzare
   */
  getCurrentDialog(): DialogRef | null {
    return this.currentDialog;
  }

  /**
   * Chiude il dialog corrente
   */
  close(result: boolean = false): void {
    if (this.currentDialog) {
      this.currentDialog.close(result);
    }
  }
}

/**
 * Riferimento a un dialog aperto
 */
export class DialogRef {
  private afterClosedSubject = new Subject<boolean>();

  constructor(public data: DialogData) {}

  /**
   * Chiude il dialog con risultato
   */
  close(result: boolean): void {
    this.afterClosedSubject.next(result);
    this.afterClosedSubject.complete();
  }

  /**
   * Observable che emette quando il dialog viene chiuso
   */
  afterClosed() {
    return this.afterClosedSubject.asObservable();
  }
}

/**
 * Configurazione dialog di conferma
 */
export interface ConfirmDialogOptions {
  /** Titolo dialog */
  title: string;

  /** Messaggio da mostrare */
  message: string;

  /** Testo pulsante conferma (default: "Conferma") */
  confirmText?: string;

  /** Testo pulsante annulla (default: "Annulla") */
  cancelText?: string;
}

/**
 * Dati interni del dialog
 */
export interface DialogData extends ConfirmDialogOptions {
  /** Tipo di dialog (standard o dangerous) */
  type: 'standard' | 'dangerous';
}
