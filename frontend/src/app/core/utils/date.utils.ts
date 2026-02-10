/**
 * Utility per formattazione e manipolazione date
 *
 * Il backend restituisce date in formato ISO 8601 (es: "2024-01-15T14:30:00")
 * Queste funzioni convertono le date in formati leggibili per l'utente
 */

/**
 * Formatta una data ISO in formato italiano leggibile
 *
 * @param isoDate Data in formato ISO 8601
 * @returns Stringa formattata (es: "15 gennaio 2024, 14:30")
 */
export function formatDate(isoDate: string): string {
  const date = new Date(isoDate);

  if (Number.isNaN(date.getTime())) {
    return 'Data non valida';
  }

  return new Intl.DateTimeFormat('it-IT', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Formatta una data ISO in formato breve
 *
 * @param isoDate Data in formato ISO 8601
 * @returns Stringa formattata (es: "15/01/2024")
 */
export function formatDateShort(isoDate: string): string {
  const date = new Date(isoDate);

  if (Number.isNaN(date.getTime())) {
    return 'Data non valida';
  }

  return new Intl.DateTimeFormat('it-IT', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * Formatta solo l'ora da una data ISO
 *
 * @param isoDate Data in formato ISO 8601
 * @returns Stringa formattata (es: "14:30")
 */
export function formatTime(isoDate: string): string {
  const date = new Date(isoDate);

  if (Number.isNaN(date.getTime())) {
    return 'Ora non valida';
  }

  return new Intl.DateTimeFormat('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Formatta una data in formato relativo (es: "2 ore fa", "ieri", "3 giorni fa")
 * Stile social media - utile per post, commenti, notifiche
 *
 * @param isoDate Data in formato ISO 8601
 * @returns Stringa relativa (es: "2 minuti fa")
 */
export function formatTimeAgo(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();

  if (Number.isNaN(date.getTime())) {
    return 'Data non valida';
  }

  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);

  if (diffSeconds < 10) {
    return 'Adesso';
  }

  if (diffSeconds < 60) {
    return `${diffSeconds} secondi fa`;
  }

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return formatUnit(diffMinutes, 'minuto', 'minuti');
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return formatUnit(diffHours, 'ora', 'ore');
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return diffDays === 1 ? 'Ieri' : formatUnit(diffDays, 'giorno', 'giorni');
  }

  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 4) {
    return formatUnit(diffWeeks, 'settimana', 'settimane');
  }

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) {
    return formatUnit(diffMonths, 'mese', 'mesi');
  }

  const diffYears = Math.floor(diffDays / 365);
  return formatUnit(diffYears, 'anno', 'anni');
}

function formatUnit(value: number, singular: string, plural: string): string {
  return value === 1 ? `1 ${singular} fa` : `${value} ${plural} fa`;
}

/**
 * Verifica se una data è oggi
 *
 * @param isoDate Data in formato ISO 8601
 * @returns true se la data è oggi
 */
export function isToday(isoDate: string): boolean {
  const date = new Date(isoDate);
  const today = new Date();

  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

/**
 * Verifica se una data è ieri
 *
 * @param isoDate Data in formato ISO 8601
 * @returns true se la data è ieri
 */
export function isYesterday(isoDate: string): boolean {
  const date = new Date(isoDate);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  return (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  );
}

/**
 * Verifica se una data è questa settimana
 *
 * @param isoDate Data in formato ISO 8601
 * @returns true se la data è in questa settimana
 */
export function isThisWeek(isoDate: string): boolean {
  const date = new Date(isoDate);
  const now = new Date();

  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  return diffDays < 7;
}

/**
 * Calcola la differenza in giorni tra due date
 *
 * @param date1 Prima data in formato ISO 8601
 * @param date2 Seconda data in formato ISO 8601 (default: ora)
 * @returns Numero di giorni di differenza
 */
export function getDaysDifference(date1: string, date2?: string): number {
  const d1 = new Date(date1);
  const d2 = date2 ? new Date(date2) : new Date();

  const diffMs = Math.abs(d2.getTime() - d1.getTime());
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Formatta una data per input datetime-local
 *
 * @param isoDate Data in formato ISO 8601
 * @returns Stringa nel formato "YYYY-MM-DDTHH:mm"
 */
export function formatForDatetimeInput(isoDate: string): string {
  const date = new Date(isoDate);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Raggruppa date per giorno
 * Utile per chat/messaggi dove vuoi separare i messaggi per giorno
 *
 * @param isoDate Data in formato ISO 8601
 * @returns Etichetta del gruppo (es: "Oggi", "Ieri", "15 gennaio 2024")
 */
export function getDateGroupLabel(isoDate: string): string {
  if (isToday(isoDate)) {
    return 'Oggi';
  }

  if (isYesterday(isoDate)) {
    return 'Ieri';
  }

  const date = new Date(isoDate);

  // Per date recenti (questa settimana), mostra il giorno della settimana
  if (isThisWeek(isoDate)) {
    return new Intl.DateTimeFormat('it-IT', {
      weekday: 'long',
    }).format(date);
  }

  // Per date più vecchie, mostra la data completa
  return new Intl.DateTimeFormat('it-IT', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

/**
 * Verifica se una data è nel futuro
 *
 * @param isoDate Data in formato ISO 8601
 * @returns true se la data è nel futuro
 */
export function isFuture(isoDate: string): boolean {
  const date = new Date(isoDate);
  const now = new Date();

  return date.getTime() > now.getTime();
}

/**
 * Verifica se una data è nel passato
 *
 * @param isoDate Data in formato ISO 8601
 * @returns true se la data è nel passato
 */
export function isPast(isoDate: string): boolean {
  const date = new Date(isoDate);
  const now = new Date();

  return date.getTime() < now.getTime();
}

/**
 * Converte una data locale in ISO string per inviarla al backend
 *
 * @param date Data JavaScript
 * @returns Stringa ISO 8601
 */
export function toISOString(date: Date): string {
  return date.toISOString();
}

/**
 * Ottiene l'inizio della giornata (00:00:00) per una data
 *
 * @param isoDate Data in formato ISO 8601
 * @returns Nuova data all'inizio della giornata
 */
export function getStartOfDay(isoDate: string): Date {
  const date = new Date(isoDate);
  date.setHours(0, 0, 0, 0);
  return date;
}

/**
 * Ottiene la fine della giornata (23:59:59) per una data
 *
 * @param isoDate Data in formato ISO 8601
 * @returns Nuova data alla fine della giornata
 */
export function getEndOfDay(isoDate: string): Date {
  const date = new Date(isoDate);
  date.setHours(23, 59, 59, 999);
  return date;
}
