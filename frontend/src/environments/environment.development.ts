export const environment = {
  production: false,

  apiUrl: 'http://localhost:8080/api',
  wsUrl: 'http://localhost:8080/ws',

  // Cloudinary Storage Configuration
  cloudinary: {
    cloudName: 'duenbvoog',
    uploadPreset: 'classconnect_images',
    folder: 'classconnect',
  },

  // Upload Configuration
  uploadMaxSize: 5 * 1024 * 1024,
  imageMaxWidth: 1920,
  imageMaxHeight: 1920,
  allowedImageTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],

  // Paginazione
  defaultPageSize: 20,
  maxPageSize: 100,

  // Debounce & Timing
  searchDebounceMs: 300,
  typingIndicatorDebounceMs: 500,

  // WebSocket
  wsReconnectInterval: 5000,
  wsMaxReconnectAttempts: 10,

  // Toast Notifications
  toastDuration: 3000,
  toastPosition: 'top-right' as const,

  // Cache
  httpCacheTimeout: 5 * 60 * 1000,

  // Push Notifications (VAPID)
  vapidPublicKey:
    'BNq3Z1o6L2WRWHQzxC074_BykE4ZWCsqiAbDzQBo5X_a1nn-EQgne-6yvd6D_ziiDedf7v_bf0XgMEMG6k4_jSs',
};

export type Environment = typeof environment;
