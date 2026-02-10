/**
 * Tipo di toast disponibili
 */
export type ToastType = 'success' | 'error' | 'warning' | 'info';

/**
 * Interfaccia per un singolo toast
 */
export interface Toast {
  /** ID univoco del toast */
  id: string;
  
  /** Messaggio da mostrare */
  message: string;
  
  /** Tipo di toast (success, error, warning, info) */
  type: ToastType;
  
  /** Se il toast può essere chiuso manualmente dall'utente */
  dismissible: boolean;
  
  /** Durata in millisecondi prima della chiusura automatica (0 = non chiude automaticamente) */
  duration: number;
}

/**
 * Opzioni per la creazione di un toast
 */
export interface ToastOptions {
  /** Tipo di toast (default: 'info') */
  type?: ToastType;
  
  /** Se il toast può essere chiuso manualmente (default: true) */
  dismissible?: boolean;
  
  /** Durata in millisecondi prima della chiusura automatica (default: 5000) */
  duration?: number;
}