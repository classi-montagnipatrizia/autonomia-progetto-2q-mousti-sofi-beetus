import { Pipe, PipeTransform } from '@angular/core';

/**
 * Pipe per evidenziare le menzioni @username nel testo
 * 
 * SICUREZZA: Questo pipe NON usa innerHTML per evitare XSS.
 * Il contenuto viene restituito come stringa normale e deve essere usato
 * con binding di testo standard o con un componente che gestisce il parsing.
 * 
 * Utilizzo SICURO:
 * <p>{{ post.content | highlightMention }}</p>
 * 
 * Per rendering HTML sicuro, usare un componente dedicato che implementi
 * DOM manipulation manuale con createTextNode() e createElement().
 */
@Pipe({
  name: 'highlightMention',
  standalone: true,
})
export class HighlightMentionPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) {
      return '';
    }

    // Restituisce il testo pulito senza manipolazione HTML
    // Per evitare XSS, non generiamo HTML inline
    return value;
  }
}
