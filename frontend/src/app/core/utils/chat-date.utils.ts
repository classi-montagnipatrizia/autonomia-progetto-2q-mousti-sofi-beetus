/**
 * Restituisce l'etichetta data in stile WhatsApp per i separatori nelle chat.
 *
 * Logica:
 * - Stesso giorno   → "Oggi"
 * - Ieri            → "Ieri"
 * - Ultimi 7 giorni → nome del giorno ("Lunedì", "Martedì", …)
 * - Stesso anno     → "12 gennaio"
 * - Anno diverso    → "12 gennaio 2023"
 */
export function getChatDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((todayStart.getTime() - dateStart.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Oggi';
  if (diffDays === 1) return 'Ieri';

  if (diffDays < 7) {
    return capitalizeFirst(date.toLocaleDateString('it-IT', { weekday: 'long' }));
  }

  if (date.getFullYear() === now.getFullYear()) {
    return capitalizeFirst(date.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' }));
  }

  return capitalizeFirst(date.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }));
}

/**
 * Restituisce l'orario esatto in formato HH:MM (stile WhatsApp).
 */
export function formatExactTime(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '';
  const date = dateStr instanceof Date ? dateStr : new Date(dateStr);
  return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Restituisce true se i due timestamp ISO appartengono allo stesso giorno di calendario.
 */
export function isSameDay(dateStr1: string, dateStr2: string): boolean {
  const a = new Date(dateStr1);
  const b = new Date(dateStr2);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
