import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TimeAgoComponent } from '../../time-ago/time-ago-component/time-ago-component';
import { AudioPlayerComponent } from '../../audio-player/audio-player-component/audio-player-component';

/**
 * Posizione della bolla (mittente = destra, destinatario = sinistra)
 */
export type MessageBubblePosition = 'left' | 'right';

@Component({
  selector: 'app-message-bubble-component',
  imports: [CommonModule, TimeAgoComponent, AudioPlayerComponent],
  templateUrl: './message-bubble-component.html',
  styleUrl: './message-bubble-component.scss',
})
export class MessageBubbleComponent {
  /**
   * Contenuto testuale del messaggio (null per messaggi audio)
   */
  readonly contenuto = input<string | null>(null);

  /**
   * URL immagine allegata (opzionale)
   */
  readonly imageUrl = input<string | null>(null);

  /**
   * URL audio per messaggi vocali (opzionale, esclusivo con imageUrl/contenuto)
   */
  readonly audioUrl = input<string | null>(null);

  /**
   * Durata in secondi del messaggio audio
   */
  readonly audioDuration = input<number | null>(null);

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
    // I messaggi audio hanno padding ridotto (il player ha il proprio padding)
    const base = this.audioUrl()
      ? 'max-w-xs sm:max-w-sm px-3 py-2 rounded-[24px] shadow-sm backdrop-blur-md transition-all duration-300'
      : 'max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg px-4 py-2.5 rounded-[24px] shadow-sm backdrop-blur-md transition-all duration-300';

    if (this.isMine()) {
      return `${base} bg-primary-500/90 dark:bg-primary-600/90 text-white rounded-br-[6px] border border-primary-400/50`;
    }

    return `${base} bg-white/70 dark:bg-gray-800/60 text-gray-800 dark:text-gray-100 rounded-bl-[6px] border border-white/50 dark:border-gray-700/50`;
  });

  /**
   * Classi CSS per il timestamp
   */
  readonly timestampClasses = computed(() => {
    const base = 'text-[11px] font-medium mt-1';

    if (this.isMine()) {
      return `${base} text-right text-gray-400 dark:text-gray-400/80 mr-1`;
    }

    return `${base} text-left text-gray-500 dark:text-gray-400 ml-1`;
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
