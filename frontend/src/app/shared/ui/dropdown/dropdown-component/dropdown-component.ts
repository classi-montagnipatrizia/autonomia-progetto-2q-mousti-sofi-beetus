import { Component, input, signal, HostListener, ElementRef, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

export type DropdownPlacement = 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';

interface MenuPosition {
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
}

@Component({
  selector: 'app-dropdown',
  imports: [CommonModule],
  templateUrl: './dropdown-component.html',
  styleUrl: './dropdown-component.scss',
})
export class DropdownComponent {
  readonly placement = input<DropdownPlacement>('bottom-start');
  readonly minWidth = input<number>(12);
  readonly showArrow = input<boolean>(false);
  readonly strategy = input<'fixed' | 'absolute'>('fixed');

  readonly isOpen = signal<boolean>(false);
  readonly menuStyle = signal<MenuPosition>({});

  private readonly elementRef = inject(ElementRef);
  private readonly platformId = inject(PLATFORM_ID);

  readonly minWidthStyle = `${this.minWidth()}rem`;

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.isOpen()) return;
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.close();
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.isOpen()) this.close();
  }

  @HostListener('window:scroll')
  @HostListener('window:resize')
  onScrollOrResize(): void {
    if (this.isOpen()) this.recalculatePosition();
  }

  open(): void {
    this.recalculatePosition();
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
  }

  toggle(): void {
    if (this.isOpen()) {
      this.close();
    } else {
      this.open();
    }
  }

  private recalculatePosition(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const trigger = this.elementRef.nativeElement.querySelector('.dropdown-trigger');
    if (!trigger) return;

    const rect: DOMRect = trigger.getBoundingClientRect();
    const placement = this.placement();
    const pos: MenuPosition = {};
    const minW = this.minWidth() * 16; // rem → px

    if (placement === 'bottom-start' || placement === 'bottom-end') {
      pos.top = `${rect.bottom + 4}px`;
    } else {
      pos.bottom = `${window.innerHeight - rect.top + 4}px`;
    }

    if (placement === 'bottom-end' || placement === 'top-end') {
      // Anchor to the right edge of the trigger
      const rightOffset = window.innerWidth - rect.right;
      pos.right = `${rightOffset}px`;
      // Clamp so it doesn't go off the left edge
      const estimatedLeft = rect.right - minW;
      if (estimatedLeft < 8) {
        delete pos.right;
        pos.left = '8px';
      }
    } else {
      pos.left = `${rect.left}px`;
      // Clamp so it doesn't go off the right edge
      if (rect.left + minW > window.innerWidth - 8) {
        pos.left = `${window.innerWidth - minW - 8}px`;
      }
    }

    this.menuStyle.set(pos);
  }
}
