import { Injectable, signal } from '@angular/core';
import { Toast, ToastOptions, ToastType } from '../../models/toast.model';

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  // Signal per la lista di toast attivi
  private readonly _toasts = signal<Toast[]>([]);
  
  // Espone il signal come readonly
  readonly toasts = this._toasts.asReadonly();
  
  // Contatore per generare ID univoci
  private idCounter = 0;

  // Timer auto-dismiss per evitare zombie setTimeout
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();

  /**
   * Mostra un toast generico
   */
  show(message: string, options?: ToastOptions): string {
    const id = this.generateId();
    const type = options?.type ?? 'info';
    const dismissible = options?.dismissible ?? true;
    const duration = options?.duration ?? 5000;

    const toast: Toast = {
      id,
      message,
      type,
      dismissible,
      duration
    };

    // Aggiunge il toast alla lista
    this._toasts.update(toasts => [...toasts, toast]);

    if (duration > 0) {
      const timer = setTimeout(() => {
        this.timers.delete(id);
        this.dismiss(id);
      }, duration);
      this.timers.set(id, timer);
    }

    return id;
  }

  /**
   * Mostra un toast di successo
   */
  success(message: string, options?: Omit<ToastOptions, 'type'>): string {
    return this.show(message, { ...options, type: 'success' });
  }

  /**
   * Mostra un toast di errore
   */
  error(message: string, options?: Omit<ToastOptions, 'type'>): string {
    return this.show(message, { 
      ...options, 
      type: 'error',
      // Gli errori hanno durata più lunga di default (7 secondi)
      duration: options?.duration ?? 7000
    });
  }

  /**
   * Mostra un toast di warning
   */
  warning(message: string, options?: Omit<ToastOptions, 'type'>): string {
    return this.show(message, { 
      ...options, 
      type: 'warning',
      // I warning hanno durata leggermente più lunga (6 secondi)
      duration: options?.duration ?? 6000
    });
  }

  /**
   * Mostra un toast informativo
   */
  info(message: string, options?: Omit<ToastOptions, 'type'>): string {
    return this.show(message, { ...options, type: 'info' });
  }

  /**
   * Chiude un toast specifico per ID
   */
  dismiss(id: string): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
    this._toasts.update(toasts => toasts.filter(toast => toast.id !== id));
  }

  /**
   * Chiude tutti i toast attivi
   */
  dismissAll(): void {
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
    this._toasts.set([]);
  }

  /**
   * Chiude tutti i toast di un tipo specifico
   */
  dismissByType(type: ToastType): void {
    const toRemove = this._toasts().filter(toast => toast.type === type);
    for (const toast of toRemove) {
      const timer = this.timers.get(toast.id);
      if (timer) {
        clearTimeout(timer);
        this.timers.delete(toast.id);
      }
    }
    this._toasts.update(toasts => toasts.filter(toast => toast.type !== type));
  }

  /**
   * Genera un ID univoco per i toast
   */
  private generateId(): string {
    return `toast-${Date.now()}-${this.idCounter++}`;
  }
}