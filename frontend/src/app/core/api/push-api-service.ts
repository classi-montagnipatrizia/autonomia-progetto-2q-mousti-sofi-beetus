import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PushSubscribeDTO {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushUnsubscribeDTO {
  endpoint: string;
}

@Injectable({
  providedIn: 'root',
})
export class PushApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/push`;

  subscribe(dto: PushSubscribeDTO): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/subscribe`, dto);
  }

  unsubscribe(dto: PushUnsubscribeDTO): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/unsubscribe`, dto);
  }
}
