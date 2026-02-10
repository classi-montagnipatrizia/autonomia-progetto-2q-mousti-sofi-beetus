import { Directive, ElementRef, inject, input, OnInit, OnDestroy, Renderer2 } from '@angular/core';

/**
 * Direttiva per lazy loading delle immagini
 *
 * Utilizzo:
 * <img appLazyLoad="https://example.com/image.jpg" alt="Descrizione">
 * <img appLazyLoad="https://example.com/image.jpg" [placeholder]="'/assets/placeholder.png'">
 */
@Directive({
  selector: 'img[appLazyLoad]',
  standalone: true,
})
export class LazyLoad implements OnInit, OnDestroy {
  private readonly el = inject(ElementRef<HTMLImageElement>);
  private readonly renderer = inject(Renderer2);

  /**
   * URL dell'immagine da caricare
   */
  readonly appLazyLoad = input.required<string>();

  /**
   * Immagine placeholder da mostrare durante il caricamento
   * @default placeholder grigio inline
   */
  readonly placeholder = input<string>(
    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"%3E%3Crect fill="%23e5e7eb" width="1" height="1"/%3E%3C/svg%3E'
  );

  /**
   * Root margin per IntersectionObserver
   * @default '50px'
   */
  readonly rootMargin = input<string>('50px');

  private observer: IntersectionObserver | null = null;

  ngOnInit(): void {
    // Imposta placeholder
    this.renderer.setAttribute(this.el.nativeElement, 'src', this.placeholder());

    // Crea observer
    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            this.loadImage();
          }
        }
      },
      {
        rootMargin: this.rootMargin(),
      }
    );

    this.observer.observe(this.el.nativeElement);
  }

  ngOnDestroy(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }

  /**
   * Carica l'immagine reale
   */
  private loadImage(): void {
    const img = this.el.nativeElement;
    const src = this.appLazyLoad();

    // Smette di osservare
    if (this.observer) {
      this.observer.unobserve(img);
    }

    // Aggiunge classe loading
    this.renderer.addClass(img, 'lazy-loading');

    // Carica immagine
    const tempImage = new Image();

    tempImage.onload = () => {
      this.renderer.setAttribute(img, 'src', src);
      this.renderer.removeClass(img, 'lazy-loading');
      this.renderer.addClass(img, 'lazy-loaded');
    };

    tempImage.onerror = () => {
      this.renderer.removeClass(img, 'lazy-loading');
      this.renderer.addClass(img, 'lazy-error');
    };

    tempImage.src = src;
  }
}
