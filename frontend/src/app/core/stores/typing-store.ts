import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { WebsocketService } from '../services/websocket-service';

@Injectable({
  providedIn: 'root',
})
export class TypingStore {
  private readonly websocketService = inject(WebsocketService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly typingStatus = signal<Map<string, boolean>>(new Map());
  private readonly clearTimers = new Map<string, ReturnType<typeof setTimeout>>();

  private readonly TYPING_TIMEOUT = 4000;

  constructor() {
    this.websocketService.typing$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => {
        const key = event.senderUsername;
        if (event.isTyping) {
          this.setUserTyping(key);
        } else {
          this.clearUserTyping(key);
        }
      });
  }

  isUserTypingByUsername(username: string): boolean {
    return this.typingStatus().get(username) ?? false;
  }

  private setUserTyping(username: string): void {
    const existing = this.clearTimers.get(username);
    if (existing) clearTimeout(existing);

    this.typingStatus.update(map => {
      const newMap = new Map(map);
      newMap.set(username, true);
      return newMap;
    });

    const timer = setTimeout(() => {
      this.clearUserTyping(username);
    }, this.TYPING_TIMEOUT);
    this.clearTimers.set(username, timer);
  }

  private clearUserTyping(username: string): void {
    const existing = this.clearTimers.get(username);
    if (existing) {
      clearTimeout(existing);
      this.clearTimers.delete(username);
    }

    this.typingStatus.update(map => {
      const newMap = new Map(map);
      newMap.delete(username);
      return newMap;
    });
  }

  clear(): void {
    this.clearTimers.forEach(timer => clearTimeout(timer));
    this.clearTimers.clear();
    this.typingStatus.set(new Map());
  }
}
