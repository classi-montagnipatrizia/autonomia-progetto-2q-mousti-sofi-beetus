import { inject, Injectable } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { Observable, from, of } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { PushApiService } from '../api/push-api-service';

const STORAGE_KEY = 'push_subscribed';
const STORAGE_ENDPOINT_KEY = 'push_endpoint';

@Injectable({
  providedIn: 'root',
})
export class PushNotificationService {
  private readonly swPush = inject(SwPush);
  private readonly pushApiService = inject(PushApiService);

  /** true se il browser supporta nativamente le push notifications */
  get isSupported(): boolean {
    return 'PushManager' in window;
  }

  /** true se il service worker Angular è attivo (false in dev mode) */
  get isSwEnabled(): boolean {
    return this.swPush.isEnabled;
  }

  /** true se l'utente ha già attivato le notifiche push su questo dispositivo */
  get isSubscribed(): boolean {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  }

  /** true se l'utente è su iOS e non ha installato la PWA (Add to Home Screen) */
  get isIosNotInstalled(): boolean {
    const isIos = /iPhone|iPad/.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    return isIos && !isStandalone;
  }

  /**
   * Richiede il permesso al browser e registra la subscription VAPID sul backend.
   * Salva l'endpoint in localStorage per poterlo recuperare all'unsubscribe.
   */
  requestPermissionAndSubscribe(): Observable<void> {
    return from(
      this.swPush.requestSubscription({
        serverPublicKey: environment.vapidPublicKey,
      })
    ).pipe(
      switchMap((sub) => {
        const key = sub.getKey('p256dh');
        const auth = sub.getKey('auth');
        const dto = {
          endpoint: sub.endpoint,
          p256dh: key ? btoa(String.fromCharCode(...new Uint8Array(key))) : '',
          auth: auth ? btoa(String.fromCharCode(...new Uint8Array(auth))) : '',
        };
        localStorage.setItem(STORAGE_ENDPOINT_KEY, sub.endpoint);
        return this.pushApiService.subscribe(dto);
      }),
      tap(() => {
        localStorage.setItem(STORAGE_KEY, 'true');
      }),
      catchError((err) => {
        console.error('Errore attivazione push notifications:', err);
        throw err;
      })
    );
  }

  /**
   * Annulla la subscription: prima salva l'endpoint (perché dopo unsubscribe non è più
   * accessibile), poi notifica il backend, poi aggiorna localStorage.
   */
  unsubscribe(): Observable<void> {
    // Recupera l'endpoint salvato prima di fare unsubscribe (dopo non è più disponibile)
    const savedEndpoint = localStorage.getItem(STORAGE_ENDPOINT_KEY);

    return from(this.swPush.unsubscribe()).pipe(
      switchMap(() => {
        if (savedEndpoint) {
          return this.pushApiService.unsubscribe({ endpoint: savedEndpoint });
        }
        return of(undefined as void);
      }),
      tap(() => {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(STORAGE_ENDPOINT_KEY);
      }),
      catchError((err) => {
        console.error('Errore disattivazione push notifications:', err);
        // Pulisce localStorage anche in caso di errore
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(STORAGE_ENDPOINT_KEY);
        throw err;
      })
    );
  }
}
