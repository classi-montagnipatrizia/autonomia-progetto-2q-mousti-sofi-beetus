import { Component, computed, inject, input } from '@angular/core';
import { TimeTickService } from '../../../../core/services/time-tick-service';
import { formatTimeAgo } from '../../../../core/utils/date.utils';

/**
 * Componente per visualizzare date in formato relativo (es: "2 ore fa")
 * Si aggiorna automaticamente ogni 60 secondi grazie al TimeTickService
 * 
 * Uso: <app-time-ago [date]="post.createdAt" />
 */
@Component({
  selector: 'app-time-ago',
  imports: [],
  templateUrl: './time-ago-component.html',
  styleUrl: './time-ago-component.scss',
})
export class TimeAgoComponent {
 private readonly timeTickService = inject(TimeTickService);

  /** Data da formattare (ISO string o Date object) */
  readonly date = input.required<string | Date | null | undefined>();

  /** Tempo relativo calcolato - si ricalcola quando tick cambia */
  readonly timeAgo = computed(() => {
    // Dipendenza dal tick per triggherare il ricalcolo
    this.timeTickService.tick();

    const value = this.date();
    if (!value) {
      return '';
    }

    // Converte Date object in stringa ISO se necessario
    const isoDate = value instanceof Date ? value.toISOString() : value;
    return formatTimeAgo(isoDate);
  });
}
