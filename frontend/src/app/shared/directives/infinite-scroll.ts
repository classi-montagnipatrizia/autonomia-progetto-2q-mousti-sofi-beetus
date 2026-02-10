import {
  Directive,
  ElementRef,
  inject,
  output,
  input,
  OnInit,
  OnDestroy,
  AfterViewInit,
} from '@angular/core';

/**
 * Direttiva per infinite scroll (carica più contenuti quando si raggiunge il fondo)
 *
 * Utilizzo:
 * <div appInfiniteScroll (scrolled)="loadMore()" [threshold]="200">
 *   Lista contenuti...
 * </div>
 *
 * Oppure su window:
 * <div appInfiniteScroll [useWindow]="true" (scrolled)="loadMore()">
 *   Lista contenuti...
 * </div>
 */
@Directive({
  selector: '[appInfiniteScroll]',
  standalone: true,
})
export class InfiniteScroll implements OnInit, AfterViewInit, OnDestroy {
  private readonly el = inject(ElementRef<HTMLElement>);

  /**
   * Distanza dal fondo (in px) per triggerare l'evento
   * @default 100
   */
  readonly threshold = input<number>(100);

  /**
   * Usa window invece dell'elemento come scroll container
   * @default false
   */
  readonly useWindow = input<boolean>(false);

  /**
   * Disabilita temporaneamente l'infinite scroll (es. durante il caricamento)
   * @default false
   */
  readonly disabled = input<boolean>(false);

  /**
   * Evento emesso quando si raggiunge il threshold
   */
  readonly scrolled = output<void>();

  private scrollHandler: (() => void) | null = null;
  private isLoading = false;

  ngOnInit(): void {
    this.scrollHandler = this.onScroll.bind(this);
  }

  ngAfterViewInit(): void {
    this.attachScrollListener();
  }

  ngOnDestroy(): void {
    this.detachScrollListener();
  }

  /**
   * Attacca il listener allo scroll
   */
  private attachScrollListener(): void {
    if (!this.scrollHandler) return;

    const target = this.useWindow() ? globalThis : this.el.nativeElement;
    target.addEventListener('scroll', this.scrollHandler, { passive: true });
  }

  /**
   * Rimuove il listener dallo scroll
   */
  private detachScrollListener(): void {
    if (!this.scrollHandler) return;

    const target = this.useWindow() ? globalThis : this.el.nativeElement;
    target.removeEventListener('scroll', this.scrollHandler);
  }

  /**
   * Handler dello scroll
   */
  private onScroll(): void {
    if (this.disabled() || this.isLoading) return;

    const shouldTrigger = this.useWindow() ? this.checkWindowScroll() : this.checkElementScroll();

    if (shouldTrigger) {
      this.isLoading = true;
      this.scrolled.emit();

      // Reset dopo un breve delay per evitare trigger multipli
      setTimeout(() => {
        this.isLoading = false;
      }, 100);
    }
  }

  /**
   * Verifica scroll su window
   */
  private checkWindowScroll(): boolean {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;

    return scrollTop + windowHeight >= documentHeight - this.threshold();
  }

  /**
   * Verifica scroll su elemento
   */
  private checkElementScroll(): boolean {
    const element = this.el.nativeElement;
    const scrollTop = element.scrollTop;
    const clientHeight = element.clientHeight;
    const scrollHeight = element.scrollHeight;

    return scrollTop + clientHeight >= scrollHeight - this.threshold();
  }
}
