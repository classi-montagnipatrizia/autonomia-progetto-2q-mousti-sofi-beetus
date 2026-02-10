export const environment = {
  production: true,

  apiUrl: 'http://localhost:8080/api',
  wsUrl: 'http://localhost:8080/ws',

  // Cloudinary Storage Configuration
  cloudinary: {
    cloudName: 'duenbvoog',
    uploadPreset: 'classconnect_images',
    folder: 'classconnect', // Cartella base per organizzare file
  },

  // Upload Configuration
  uploadMaxSize: 5 * 1024 * 1024, // 5 MB in bytes
  imageMaxWidth: 1920, // Larghezza massima immagine
  imageMaxHeight: 1920, // Altezza massima immagine
  allowedImageTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],

  // Paginazione
  defaultPageSize: 20, // Post per pagina nel feed
  maxPageSize: 100, // Limite massimo elementi per pagina

  // Debounce & Timing
  searchDebounceMs: 300, // Delay ricerca (300ms)
  typingIndicatorDebounceMs: 500, // Delay "sta scrivendo..." (500ms)

  // WebSocket
  wsReconnectInterval: 5000, // Intervallo riconnessione in ms (5 secondi)
  wsMaxReconnectAttempts: 10, // Tentativi massimi di riconnessione

  // Toast Notifications
  toastDuration: 3000, // Durata toast in ms (3 secondi)
  toastPosition: 'top-right' as const, // Posizione toast

  // Cache
  httpCacheTimeout: 5 * 60 * 1000, // Cache HTTP 5 minuti
};

export type Environment = typeof environment;
