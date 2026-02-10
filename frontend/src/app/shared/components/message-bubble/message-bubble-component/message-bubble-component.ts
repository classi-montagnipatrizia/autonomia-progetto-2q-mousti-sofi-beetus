import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TimeAgoComponent } from '../../time-ago/time-ago-component/time-ago-component';

/**
 * Posizione della bolla (mittente = destra, destinatario = sinistra)
 */
export type MessageBubblePosition = 'left' | 'right';

@Component({
  selector: 'app-message-bubble-component',
  imports: [CommonModule, TimeAgoComponent],
  templateUrl: './message-bubble-component.html',
  styleUrl: './message-bubble-component.scss',
})
export class MessageBubbleComponent {
/**
   * Contenuto testuale del messaggio
   */
  readonly contenuto = input.required<string>();

  /**
   * URL immagine allegata (opzionale)
   */
  readonly imageUrl = input<string | null>(null);

  /**
   * Data/ora del messaggio (formato ISO 8601)
   */
  readonly createdAt = input.required<string>();

  /**
   * Indica se il messaggio è stato letto
   * Mostrato solo per messaggi inviati (position = right)
   */
  readonly isRead = input<boolean>(false);

  /**
   * Indica se è un messaggio dell'utente corrente
   * @default false (messaggio ricevuto)
   */
  readonly isMine = input<boolean>(false);

  /**
   * Mostra il timestamp
   * @default true
   */
  readonly showTimestamp = input<boolean>(true);

  /**
   * Mostra lo stato di lettura (solo per messaggi inviati)
   * @default true
   */
  readonly showReadStatus = input<boolean>(true);

  /**
   * Posizione calcolata in base a isMine
   */
  readonly position = computed((): MessageBubblePosition => {
    return this.isMine() ? 'right' : 'left';
  });

  /**
   * Classi CSS per l'allineamento del contenitore
   */
  readonly alignmentClasses = computed(() => {
    return this.isMine() ? 'justify-end' : 'justify-start';
  });

  /**
   * Classi CSS per la bolla del messaggio
   */
  readonly bubbleClasses = computed(() => {
    const base = 'max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg px-4 py-2 rounded-2xl';

    if (this.isMine()) {
      // Messaggio inviato - stile blu
      return `${base} bg-primary-500 text-white rounded-br-sm`;
    }

    // Messaggio ricevuto - stile grigio
    return `${base} bg-gray-200 dark:bg-gray-700 text-text-light dark:text-text-dark rounded-bl-sm`;
  });

  /**
   * Classi CSS per il timestamp
   */
  readonly timestampClasses = computed(() => {
    const base = 'text-xs mt-1';

    if (this.isMine()) {
      return `${base} text-right text-gray-500 dark:text-gray-400`;
    }

    return `${base} text-left text-gray-500 dark:text-gray-400`;
  });

  /**
   * Verifica se mostrare lo stato di lettura
   */
  readonly shouldShowReadStatus = computed(() => {
    return this.isMine() && this.showReadStatus();
  });

  /**
   * Testo stato lettura
   */
  readonly readStatusText = computed(() => {
    return this.isRead() ? 'Letto' : 'Inviato';
  });
}
