import { Injectable, inject, signal, computed } from '@angular/core';
import { interval } from 'rxjs';
import { switchMap, startWith } from 'rxjs/operators';
import { MessageService } from '../api/message-service';

/**
 * Store per tracciare chi sta scrivendo nelle conversazioni.
 * Polling periodico per ogni conversazione attiva.
 */
@Injectable({
  providedIn: 'root',
})
export class TypingStore {
  private readonly messageService = inject(MessageService);
  
  // Map userId -> isTyping
  private readonly typingStatus = signal<Map<number, boolean>>(new Map());
  
  // Lista degli userId da monitorare
  private monitoredUsers = new Set<number>();
  private pollingSubscription: any = null;
  
  private readonly POLLING_INTERVAL = 2000;

  /**
   * Verifica se un utente sta scrivendo
   */
  isUserTyping(userId: number): boolean {
    return this.typingStatus().get(userId) ?? false;
  }

  /**
   * Imposta gli utenti da monitorare per il typing
   */
  setMonitoredUsers(userIds: number[]): void {
    this.monitoredUsers = new Set(userIds);
    this.startPolling();
  }

  /**
   * Aggiunge un utente da monitorare
   */
  addMonitoredUser(userId: number): void {
    this.monitoredUsers.add(userId);
  }

  /**
   * Avvia il polling per tutti gli utenti monitorati
   */
  private startPolling(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
    }

    this.pollingSubscription = interval(this.POLLING_INTERVAL)
      .pipe(startWith(0))
      .subscribe(() => {
        this.checkAllTypingStatus();
      });
  }

  /**
   * Controlla lo stato typing di tutti gli utenti monitorati
   */
  private checkAllTypingStatus(): void {
    for (const userId of this.monitoredUsers) {
      this.messageService.isTyping(userId).subscribe({
        next: (response) => {
          this.typingStatus.update(map => {
            const newMap = new Map(map);
            newMap.set(userId, response.isTyping);
            return newMap;
          });
        },
        error: () => {
          // Ignora errori
        },
      });
    }
  }

  /**
   * Ferma il polling
   */
  stopPolling(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = null;
    }
  }
}
