import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Dimensioni disponibili per l'avatar
 */
export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * Status badge per l'avatar
 */
export type AvatarStatus = 'online' | 'offline' | 'none';

@Component({
  selector: 'app-avatar',
  imports: [CommonModule],
  templateUrl: './avatar-component.html',
  styleUrl: './avatar-component.scss',
})
export class AvatarComponent {
  /**
   * URL dell'immagine avatar
   */
  readonly src = input<string | null>(null);

  /**
   * Nome completo dell'utente (per generare iniziali fallback)
   */
  readonly name = input.required<string>();

  /**
   * Dimensione dell'avatar
   * @default 'md'
   */
  readonly size = input<AvatarSize>('md');

  /**
   * Mostra status badge (online/offline)
   * @default 'none'
   */
  readonly status = input<AvatarStatus>('none');

  /**
   * Mostra bordo attorno all'avatar
   * @default false
   */
  readonly bordered = input<boolean>(false);

  /**
   * Alt text per accessibilità
   */
  readonly alt = input<string>('');


  /**
   * Genera le iniziali dal nome completo
   * Prende la prima lettera del nome e del cognome
   *
   * Esempi:
   * - "Mario Rossi" → "MR"
   * - "Anna" → "A"
   * - "Jean-Claude Van Damme" → "JV"
   */
  readonly initials = computed(() => {
    const fullName = this.name();
    if (!fullName) return '?';

    const parts = fullName.trim().split(/\s+/);

    if (parts.length === 1) {
      // Un solo nome: prima lettera
      return parts[0].charAt(0).toUpperCase();
    }

    // Nome e cognome: prima lettera di entrambi
    const firstName = parts[0];
    const lastName = parts[parts.length - 1];

    return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
  });

  /**
   * Restituisce le classi CSS per la dimensione dell'avatar
   */
  readonly sizeClasses = computed(() => {
    const size = this.size();

    const sizeMap: Record<AvatarSize, string> = {
      xs: 'w-6 h-6 text-xs', // 24px
      sm: 'w-8 h-8 text-sm', // 32px
      md: 'w-10 h-10 text-base', // 40px
      lg: 'w-12 h-12 text-lg', // 48px
      xl: 'w-16 h-16 text-xl', // 64px
    };

    return sizeMap[size];
  });

  /**
   * Restituisce le classi CSS per il contenitore principale
   * Combina le classi di dimensione e il bordo opzionale
   */
  readonly containerClasses = computed(() => {
    return {
      [this.sizeClasses()]: true,
      'ring-2 ring-border-light dark:ring-border-dark': this.bordered(),
    };
  });

  /**
   * Restituisce le classi CSS per lo status badge
   */
  readonly statusClasses = computed(() => {
    const status = this.status();
    const size = this.size();

    if (status === 'none') return '';

    // Dimensione del badge in base alla dimensione dell'avatar
    const badgeSizeMap: Record<AvatarSize, string> = {
      xs: 'w-1.5 h-1.5',
      sm: 'w-2 h-2',
      md: 'w-2.5 h-2.5',
      lg: 'w-3 h-3',
      xl: 'w-4 h-4',
    };

    const badgeSize = badgeSizeMap[size];

    // Colore del badge
    const badgeColor = status === 'online' ? 'bg-success-500' : 'bg-offline';

    return `${badgeSize} ${badgeColor} absolute bottom-0 right-0 rounded-full border-2 border-surface-light dark:border-surface-dark`;
  });

  /**
   * Alt text generato automaticamente se non fornito
   */
  readonly computedAlt = computed(() => {
    return this.alt() || `Avatar di ${this.name()}`;
  });


  /**
   * Traccia se l'immagine ha fallito il caricamento
   */
  imageError = false;

  /**
   * Handler per errore caricamento immagine
   * Mostra le iniziali come fallback
   */
  onImageError(): void {
    this.imageError = true;
  }

  /**
   * Verifica se deve mostrare l'immagine o le iniziali
   */
  shouldShowImage(): boolean {
    return !!this.src() && !this.imageError;
  }
}
