import { Pipe, PipeTransform } from '@angular/core';
import { formatTimeAgo } from '../../core/utils/date.utils';

/**
 * @deprecated Usa `TimeAgoComponent` invece per aggiornamenti automatici basati su signal.
 * Questa pipe pura non si aggiorna automaticamente nel tempo.
 * 
 * Pipe per formattare date in formato relativo (es: "2 ore fa")
 */
@Pipe({
  name: 'timeAgo',
  standalone: true,
  pure: true,
})
export class TimeAgoPipe implements PipeTransform {
  transform(value: string | Date | null | undefined): string {
    if (!value) {
      return '';
    }

    // Converte Date object in stringa ISO se necessario
    const isoDate = value instanceof Date ? value.toISOString() : value;

    return formatTimeAgo(isoDate);
  }
}
