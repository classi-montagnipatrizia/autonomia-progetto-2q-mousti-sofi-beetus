import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { CreaSegnazioneDTO, SegnazioneDTO } from '../../models';

@Injectable({ providedIn: 'root' })
export class ReportService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/reports`;

  segnala(dto: CreaSegnazioneDTO): Observable<SegnazioneDTO> {
    return this.http.post<SegnazioneDTO>(this.baseUrl, dto);
  }
}
