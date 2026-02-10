/**
 * Configurazione centralizzata dell'applicazione
 *
 * Tutte le costanti, timing, limiti e configurazioni devono essere
 * definite qui invece di essere hard-coded nel codice.
 */

/**
 * Intervalli di polling (in millisecondi)
 */
export const POLLING_INTERVALS = {
  /** Polling messaggi chat */
  MESSAGES: 3000,
  /** Polling conversazioni */
  CONVERSATIONS: 5000,
  /** Polling typing indicator */
  TYPING: 2000,
  /** Polling notifiche */
  NOTIFICATIONS: 5000,
  /** Polling feed */
  FEED: 10000,
  /** Polling utenti online */
  ONLINE_USERS: 5000
} as const;

/**
 * Timeout e ritardi (in millisecondi)
 */
export const TIMEOUTS = {
  /** Timeout per richieste HTTP standard */
  HTTP_REQUEST: 30000,
  /** Debounce per ricerca */
  SEARCH_DEBOUNCE: 300,
  /** Throttle per typing indicator */
  TYPING_THROTTLE: 2000,
  /** Durata evidenziazione messaggio */
  MESSAGE_HIGHLIGHT: 5000,
  /** Durata toast notification */
  TOAST_DURATION: 3000,
  /** Ritardo scroll con animazione */
  SCROLL_DELAY: 200,
  /** Ritardo tra tentativi scroll */
  SCROLL_RETRY_DELAY: 50
} as const;

/**
 * Limiti e dimensioni
 */
export const LIMITS = {
  /** Numero massimo tentativi scroll */
  MAX_SCROLL_RETRIES: 10,
  /** Lunghezza massima post */
  MAX_POST_LENGTH: 500,
  /** Lunghezza massima commento */
  MAX_COMMENT_LENGTH: 300,
  /** Lunghezza massima messaggio */
  MAX_MESSAGE_LENGTH: 1000,
  /** Dimensione massima immagine (MB) */
  MAX_IMAGE_SIZE_MB: 10,
  /** Numero elementi per pagina */
  PAGE_SIZE: 20,
  /** Lunghezza minima ricerca */
  MIN_SEARCH_LENGTH: 2,
  /** Numero massimo file upload simultanei */
  MAX_CONCURRENT_UPLOADS: 3
} as const;

/**
 * Configurazione WebSocket
 */
export const WEBSOCKET_CONFIG = {
  /** Numero massimo tentativi riconnessione */
  MAX_RECONNECT_ATTEMPTS: 5,
  /** Ritardo base per riconnessione (ms) */
  RECONNECT_DELAY_BASE: 1000,
  /** Moltiplicatore exponential backoff */
  RECONNECT_BACKOFF_MULTIPLIER: 2,
  /** Ritardo massimo riconnessione (ms) */
  RECONNECT_DELAY_MAX: 30000,
  /** Heartbeat incoming (ms) */
  HEARTBEAT_INCOMING: 10000,
  /** Heartbeat outgoing (ms) */
  HEARTBEAT_OUTGOING: 10000
} as const;

/**
 * Spaziature e dimensioni UI (in pixel)
 */
export const UI_SPACING = {
  /** Spaziatura tra messaggi (corrisponde a Tailwind space-y-4) */
  MESSAGE_SPACING: 16,
  /** Altezza header */
  HEADER_HEIGHT: 64,
  /** Larghezza sidebar */
  SIDEBAR_WIDTH: 320
} as const;

/**
 * Configurazione cache
 */
export const CACHE_CONFIG = {
  /** Durata cache profili utente (ms) */
  USER_PROFILE_TTL: 300000, // 5 minuti
  /** Durata cache post (ms) */
  POST_TTL: 60000, // 1 minuto
  /** Dimensione massima cache */
  MAX_CACHE_SIZE: 100
} as const;

/**
 * Configurazione validazione
 */
export const VALIDATION = {
  /** Regex per username */
  USERNAME_PATTERN: /^[a-zA-Z0-9_]{3,20}$/,
  /** Regex per email */
  EMAIL_PATTERN: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  /** Lunghezza minima password */
  PASSWORD_MIN_LENGTH: 8,
  /** Lunghezza massima password */
  PASSWORD_MAX_LENGTH: 128
} as const;

/**
 * Feature flags
 */
export const FEATURE_FLAGS = {
  /** Abilita infinite scroll */
  ENABLE_INFINITE_SCROLL: true,
  /** Abilita notifiche real-time */
  ENABLE_REALTIME_NOTIFICATIONS: true,
  /** Abilita PWA */
  ENABLE_PWA: true,
  /** Abilita dark mode */
  ENABLE_DARK_MODE: true,
  /** Abilita analytics */
  ENABLE_ANALYTICS: false
} as const;

/**
 * Tipi helper per type safety
 */
export type PollingInterval = typeof POLLING_INTERVALS[keyof typeof POLLING_INTERVALS];
export type Timeout = typeof TIMEOUTS[keyof typeof TIMEOUTS];
export type Limit = typeof LIMITS[keyof typeof LIMITS];
