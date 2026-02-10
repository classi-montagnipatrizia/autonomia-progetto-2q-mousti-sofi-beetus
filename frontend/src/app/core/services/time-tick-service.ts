import { Injectable, signal } from '@angular/core';

/**
 * Servizio che emette un "tick" ogni minuto per aggiornare i tempi relativi.
 * 
 * Usato insieme alla pipe timeAgo per aggiornare automaticamente
 * i valori "X minuti fa" senza causare errori NG0100.
 * 
 * Il tick è un semplice contatore che incrementa ogni minuto.
 * I componenti possono usarlo come dipendenza nei computed signals
 * per forzare il ricalcolo del tempo relativo.
 */
@Injectable({
  providedIn: 'root',
})
export class TimeTickService {
  /** Tick counter che incrementa ogni minuto */
  readonly tick = signal<number>(0);

  /** Intervallo di aggiornamento in millisecondi (1 minuto) */
  private readonly TICK_INTERVAL = 60000;

  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.startTicking();
  }

  /**
   * Avvia il timer che incrementa il tick ogni minuto
   */
  private startTicking(): void {
    if (this.intervalId) return;

    this.intervalId = setInterval(() => {
      this.tick.update(t => t + 1);
    }, this.TICK_INTERVAL);
  }

  /**
   * Ferma il timer (chiamare se necessario per cleanup)
   */
  stopTicking(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Forza un aggiornamento immediato del tick
   */
  forceTick(): void {
    this.tick.update(t => t + 1);
  }
}
