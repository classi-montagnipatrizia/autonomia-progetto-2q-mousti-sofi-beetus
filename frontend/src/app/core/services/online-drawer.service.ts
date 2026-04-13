import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class OnlineDrawerService {
  readonly isOpen = signal(false);

  toggle(): void {
    this.isOpen.update(v => !v);
  }

  close(): void {
    this.isOpen.set(false);
  }
}
