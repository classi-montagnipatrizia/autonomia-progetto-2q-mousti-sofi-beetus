import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { catchError, from, Observable, switchMap, throwError } from 'rxjs';
import { LoggerService } from './logger.service';
/**
 * Tipo di immagine da caricare (determina la cartella su Cloudinary)
 * - profile: Immagini profilo utente
 * - post: Immagini allegate ai post
 * - message: Immagini nei messaggi privati
 */
export type ImageType = 'profile' | 'post' | 'message';

/**
 * Risposta di upload da Cloudinary
 */
export interface CloudinaryUploadResponse {
  url: string; // URL pubblico dell'immagine
  secureUrl: string; // URL HTTPS
  publicId: string; // ID univoco su Cloudinary
  width: number;
  height: number;
  format: string;
  bytes: number;
}

/**
 * Errore di validazione upload
 */
export class UploadValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UploadValidationError';
  }
}
@Injectable({
  providedIn: 'root'
})
export class CloudinaryStorageService {
  private readonly http = inject(HttpClient);
  private readonly logger = inject(LoggerService);

  private readonly cloudName = environment.cloudinary.cloudName;
  private readonly uploadPreset = environment.cloudinary.uploadPreset;
  private readonly baseFolder = environment.cloudinary.folder;
  private readonly uploadUrl = `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`;
  private readonly apiUrl = environment.apiUrl;

  /**
   * Upload di un'immagine su Cloudinary
   * 
   * @param file File immagine da caricare
   * @param type Tipo di immagine (determina la sottocartella)
   * @param onProgress Callback per monitorare il progresso (opzionale)
   * @returns Observable con la risposta di Cloudinary
   */
  uploadImage(
    file: File,
    type: ImageType,
    onProgress?: (progress: number) => void
  ): Observable<CloudinaryUploadResponse> {
    // Validazione del file
    const validationError = this.validateImage(file);
    if (validationError) {
      return throwError(() => new UploadValidationError(validationError));
    }

    // Comprimi l'immagine prima dell'upload
    return from(this.compressImage(file)).pipe(
      switchMap((compressedFile) => {
        const formData = this.buildFormData(compressedFile, type);
        return this.performUpload(formData, onProgress);
      }),
      catchError((error) => {
        this.logger.error('Errore upload immagine', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Valida un file immagine
   * 
   * @returns Messaggio di errore o null se valido
   */
  private validateImage(file: File): string | null {
    // Verifica che sia un file
    if (!file) {
      return 'Nessun file selezionato';
    }

    // Verifica tipo MIME
    if (!environment.allowedImageTypes.includes(file.type)) {
      return 'Formato file non supportato. Usa JPG, PNG o WEBP';
    }

    // Verifica dimensione
    if (file.size > environment.uploadMaxSize) {
      const maxSizeMB = environment.uploadMaxSize / (1024 * 1024);
      return `Il file è troppo grande. Dimensione massima: ${maxSizeMB}MB`;
    }

    return null;
  }

  /**
   * Comprimi l'immagine se supera le dimensioni massime
   */
  private async compressImage(file: File): Promise<File> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e: ProgressEvent<FileReader>) => {
        if (!e.target?.result) {
          reject(new Error('Errore lettura file'));
          return;
        }

        img.src = e.target.result as string;
      };

      img.onload = () => {
        const { width, height } = img;
        const maxWidth = environment.imageMaxWidth;
        const maxHeight = environment.imageMaxHeight;

        // Se l'immagine è già sotto i limiti, restituisci il file originale
        if (width <= maxWidth && height <= maxHeight) {
          resolve(file);
          return;
        }

        // Calcola nuove dimensioni mantenendo l'aspect ratio
        let newWidth = width;
        let newHeight = height;

        if (width > maxWidth) {
          newWidth = maxWidth;
          newHeight = (height * maxWidth) / width;
        }

        if (newHeight > maxHeight) {
          newHeight = maxHeight;
          newWidth = (width * maxHeight) / height;
        }

        // Crea canvas per il resize
        const canvas = document.createElement('canvas');
        canvas.width = newWidth;
        canvas.height = newHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Errore creazione canvas'));
          return;
        }

        // Disegna l'immagine ridimensionata
        ctx.drawImage(img, 0, 0, newWidth, newHeight);

        // Converti in Blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Errore conversione immagine'));
              return;
            }

            // Crea nuovo File dal Blob
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });

            resolve(compressedFile);
          },
          file.type,
          0.9 // Qualità JPEG 90%
        );
      };

      img.onerror = () => {
        reject(new Error('Errore caricamento immagine'));
      };

      reader.onerror = () => {
        reject(new Error('Errore lettura file'));
      };

      reader.readAsDataURL(file);
    });
  }

  /**
   * Costruisce il FormData per l'upload a Cloudinary
   */
  private buildFormData(file: File, type: ImageType): FormData {
    const formData = new FormData();

    formData.append('file', file);
    formData.append('upload_preset', this.uploadPreset);

    // Organizza i file in sottocartelle per tipo
    const folder = `${this.baseFolder}/${type}s`; // profiles, posts
    formData.append('folder', folder);

    // Genera un public_id univoco (timestamp + random)
    const uniqueId = `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    formData.append('public_id', uniqueId);

    return formData;
  }

  /**
   * Esegue l'upload effettivo tramite XMLHttpRequest (per monitorare il progresso)
   */
  private performUpload(
    formData: FormData,
    onProgress?: (progress: number) => void
  ): Observable<CloudinaryUploadResponse> {
    return new Observable((observer) => {
      const xhr = new XMLHttpRequest();

      // Monitora il progresso dell'upload
      if (onProgress) {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            onProgress(progress);
          }
        });
      }

      // Gestisce la risposta
      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            observer.next({
              url: response.url,
              secureUrl: response.secure_url,
              publicId: response.public_id,
              width: response.width,
              height: response.height,
              format: response.format,
              bytes: response.bytes,
            });
            observer.complete();
          } catch (error) {
            observer.error(new Error('Errore parsing risposta Cloudinary'));
          }
        } else {
          observer.error(new Error(`Errore upload: ${xhr.status} ${xhr.statusText}`));
        }
      });

      // Gestisce errori di rete
      xhr.addEventListener('error', () => {
        observer.error(new Error('Errore di rete durante l\'upload'));
      });

      // Gestisce timeout
      xhr.addEventListener('timeout', () => {
        observer.error(new Error('Timeout durante l\'upload'));
      });

      // Esegue la richiesta
      xhr.open('POST', this.uploadUrl);
      xhr.timeout = 60000; // Timeout 60 secondi
      xhr.send(formData);

      // Cleanup per unsubscribe
      return () => {
        if (xhr.readyState !== XMLHttpRequest.DONE) {
          xhr.abort();
        }
      };
    });
  }

  /**
   * Elimina un'immagine da Cloudinary tramite backend.
   * <p>
   * L'eliminazione viene effettuata dal backend per motivi di sicurezza:
   * - Le credenziali API_SECRET non vengono esposte al frontend
   * - Il backend verifica che l'utente sia proprietario dell'immagine
   * - Il riferimento viene rimosso anche dal database
   *
   * @param imageUrl URL completo dell'immagine su Cloudinary
   * @returns Observable che completa quando l'eliminazione è avvenuta
   */
  deleteImage(imageUrl: string): Observable<void> {
    // Chiama l'endpoint backend che gestisce l'eliminazione sicura
    return this.http.delete<void>(`${this.apiUrl}/images`, {
      params: { url: imageUrl }
    }).pipe(
      catchError((error) => {
        this.logger.error('Errore eliminazione immagine', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Ottiene un URL trasformato di Cloudinary (resize, crop, ecc.)
   * Utile per ottimizzare le immagini senza re-upload
   * 
   * @param publicId Public ID dell'immagine su Cloudinary
   * @param transformations Trasformazioni da applicare (es. "w_300,h_300,c_fill")
   */
  getTransformedUrl(publicId: string, transformations: string): string {
    return `https://res.cloudinary.com/${this.cloudName}/image/upload/${transformations}/${publicId}`;
  }

  /**
   * Genera URL di thumbnail
   */
  getThumbnailUrl(publicId: string, size: number = 150): string {
    return this.getTransformedUrl(publicId, `w_${size},h_${size},c_fill,g_face`);
  }
}
