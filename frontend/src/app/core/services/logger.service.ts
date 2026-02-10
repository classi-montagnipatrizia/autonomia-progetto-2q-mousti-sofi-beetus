import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

/**
 * Livelli di logging disponibili
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

/**
 * Servizio centralizzato per il logging dell'applicazione.
 *
 * In produzione, i log possono essere inviati a servizi esterni (Sentry, LogRocket, etc.)
 * In sviluppo, vengono stampati sulla console.
 *
 * Uso:
 * ```typescript
 * constructor(private logger: LoggerService) {}
 *
 * this.logger.debug('Debug message', { data });
 * this.logger.info('Info message');
 * this.logger.warn('Warning message', error);
 * this.logger.error('Error message', error);
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class LoggerService {
  private readonly logLevel: LogLevel;
  private readonly enableConsole: boolean;

  constructor() {
    // In produzione, imposta logLevel a ERROR o NONE
    this.logLevel = environment.production ? LogLevel.ERROR : LogLevel.DEBUG;
    this.enableConsole = !environment.production;
  }

  /**
   * Log di debug - dettagli tecnici per sviluppo
   */
  debug(message: string, ...args: unknown[]): void {
    this.log(LogLevel.DEBUG, message, args);
  }

  /**
   * Log informativo - eventi normali dell'applicazione
   */
  info(message: string, ...args: unknown[]): void {
    this.log(LogLevel.INFO, message, args);
  }

  /**
   * Log di warning - situazioni anomale ma gestibili
   */
  warn(message: string, ...args: unknown[]): void {
    this.log(LogLevel.WARN, message, args);
  }

  /**
   * Log di errore - errori che richiedono attenzione
   */
  error(message: string, error?: unknown, ...args: unknown[]): void {
    this.log(LogLevel.ERROR, message, [error, ...args]);

  }

  /**
   * Metodo interno per gestire il logging
   */
  private log(level: LogLevel, message: string, args: unknown[]): void {
    if (level < this.logLevel) {
      return;
    }

    if (!this.enableConsole) {
      return;
    }

    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${LogLevel[level]}]`;
    const formattedMessage = `${prefix} ${message}`;

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formattedMessage, ...args);
        break;
      case LogLevel.INFO:
        console.info(formattedMessage, ...args);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage, ...args);
        break;
      case LogLevel.ERROR:
        console.error(formattedMessage, ...args);
        break;
    }
  }


}
