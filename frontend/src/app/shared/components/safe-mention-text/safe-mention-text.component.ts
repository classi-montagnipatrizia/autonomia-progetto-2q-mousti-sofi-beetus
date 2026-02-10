import {
  Component,
  input,
  effect,
  ElementRef,
  viewChild,
  Renderer2,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';

/**
 * Componente sicuro per rendering di testo con menzioni @username
 * 
 * SICUREZZA: Non usa innerHTML ma manipola manualmente il DOM per evitare XSS
 * 
 * Utilizzo:
 * <app-safe-mention-text [content]="post.content" />
 * 
 * Features:
 * - Evidenzia @username con styling
 * - Click su menzione → navigazione a /search?q=username&tab=users
 * - Protezione XSS tramite createTextNode() e createElement()
 * - Supporta testo multilinea e URL
 */
@Component({
  selector: 'app-safe-mention-text',
  standalone: true,
  template: `
    <span #container class="safe-mention-text"></span>
  `,
  styles: [`
    :host {
      display: contents;
    }
    
    .safe-mention-text {
      white-space: pre-wrap;
      word-break: break-word;
    }
  `],
})
export class SafeMentionTextComponent {
  // Input content
  content = input<string | null | undefined>('');

  // ViewChild per accesso al container
  private readonly container = viewChild.required<ElementRef<HTMLSpanElement>>('container');

  // Services
  private readonly renderer = inject(Renderer2);
  private readonly router = inject(Router);

  constructor() {
    // Effect che si attiva quando content cambia
    effect(() => {
      this.renderContent();
    });
  }

  /**
   * Render sicuro del contenuto con evidenziazione menzioni
   */
  private renderContent(): void {
    const contentValue = this.content();
    const containerEl = this.container().nativeElement;

    // Pulisce il container
    while (containerEl.firstChild) {
      this.renderer.removeChild(containerEl, containerEl.firstChild);
    }

    if (!contentValue) {
      return;
    }

    // Regex per trovare @username (lettere, numeri, underscore)
    const mentionRegex = /@(\w+)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    // Parsing del testo e creazione nodi sicuri
    while ((match = mentionRegex.exec(contentValue)) !== null) {
      // Testo prima della menzione
      if (match.index > lastIndex) {
        const textBefore = contentValue.substring(lastIndex, match.index);
        const textNode = this.renderer.createText(textBefore);
        this.renderer.appendChild(containerEl, textNode);
      }

      // Crea link per la menzione
      const username = match[1];
      const mentionLink = this.createMentionLink(username);
      this.renderer.appendChild(containerEl, mentionLink);

      lastIndex = mentionRegex.lastIndex;
    }

    // Testo rimanente dopo l'ultima menzione
    if (lastIndex < contentValue.length) {
      const textAfter = contentValue.substring(lastIndex);
      const textNode = this.renderer.createText(textAfter);
      this.renderer.appendChild(containerEl, textNode);
    }
  }

  /**
   * Crea un elemento <a> sicuro per la menzione
   */
  private createMentionLink(username: string): HTMLAnchorElement {
    const link = this.renderer.createElement('a') as HTMLAnchorElement;

    // Testo del link (sempre escapato tramite createText)
    const linkText = this.renderer.createText(`@${username}`);
    this.renderer.appendChild(link, linkText);

    // Attributi
    this.renderer.setAttribute(link, 'href', 'javascript:void(0)');
    this.renderer.setAttribute(link, 'role', 'button');
    this.renderer.setAttribute(link, 'tabindex', '0');

    // Classi Tailwind per styling
    this.renderer.addClass(link, 'mention-link');
    this.renderer.addClass(link, 'text-primary-500');
    this.renderer.addClass(link, 'hover:text-primary-600');
    this.renderer.addClass(link, 'dark:text-primary-400');
    this.renderer.addClass(link, 'dark:hover:text-primary-300');
    this.renderer.addClass(link, 'font-medium');
    this.renderer.addClass(link, 'hover:underline');
    this.renderer.addClass(link, 'cursor-pointer');
    this.renderer.addClass(link, 'transition-colors');

    // Event listener per navigazione
    this.renderer.listen(link, 'click', (event: Event) => {
      event.preventDefault();
      this.navigateToSearch(username);
    });

    // Supporto keyboard accessibility
    this.renderer.listen(link, 'keydown', (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this.navigateToSearch(username);
      }
    });

    return link;
  }

  /**
   * Navigazione alla ricerca utente
   */
  private navigateToSearch(username: string): void {
    this.router.navigate(['/search'], {
      queryParams: { q: username, tab: 'users' },
    });
  }
}
