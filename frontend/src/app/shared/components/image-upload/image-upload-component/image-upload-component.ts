import { Component, input, output, signal, inject, computed, ElementRef, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Upload, X, Image, CircleAlert } from 'lucide-angular';
import { SpinnerComponent } from '../../../ui/spinner/spinner-component/spinner-component';
import { ButtonComponent } from '../../../ui/button/button-component/button-component';
import { CloudinaryStorageService, ImageType, UploadValidationError } from '../../../../core/services/cloudinary-storage-service';

/**
 * Stato corrente dell'upload
 */
export type UploadState = 'idle' | 'uploading' | 'success' | 'error';

@Component({
  selector: 'app-image-upload-component',
  imports: [CommonModule, LucideAngularModule, SpinnerComponent, ButtonComponent],
  templateUrl: './image-upload-component.html',
  styleUrl: './image-upload-component.scss',
})
export class ImageUploadComponent {
  private readonly storageService = inject(CloudinaryStorageService);

  // Riferimento all'input file nascosto
  readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInputRef');

  // Icone Lucide
  readonly UploadIcon = Upload;
  readonly XIcon = X;
  readonly ImageIcon = Image;
  readonly AlertCircleIcon = CircleAlert;

  /**
   * Tipo di immagine (determina la cartella su Cloudinary)
   * @default 'post'
   */
  readonly imageType = input<ImageType>('post');

  /**
   * URL immagine esistente (per editing)
   */
  readonly existingImageUrl = input<string | null>(null);

  /**
   * Testo del placeholder
   * @default 'Carica un\'immagine'
   */
  readonly placeholder = input<string>("Carica un'immagine");

  /**
   * Mostra anteprima dopo l'upload
   * @default true
   */
  readonly showPreview = input<boolean>(true);

  /**
   * Abilita il drag & drop
   * @default true
   */
  readonly enableDragDrop = input<boolean>(true);

  /**
   * Dimensione massima in MB (per messaggio UI)
   * @default 5
   */
  readonly maxSizeMB = input<number>(5);

  /**
   * Larghezza del contenitore
   * @default '100%'
   */
  readonly width = input<string>('100%');

  /**
   * Altezza del contenitore
   * @default '200px'
   */
  readonly height = input<string>('200px');

  /**
   * Emesso quando l'upload è completato con successo
   * Restituisce l'URL dell'immagine
   */
  readonly uploadSuccess = output<string>();

  /**
   * Emesso quando si verifica un errore
   */
  readonly uploadError = output<string>();

  /**
   * Emesso quando l'immagine viene rimossa
   */
  readonly imageRemoved = output<void>();

  // Stato interno
  readonly uploadState = signal<UploadState>('idle');
  readonly uploadProgress = signal<number>(0);
  readonly errorMessage = signal<string>('');
  readonly previewUrl = signal<string | null>(null);
  readonly uploadedImageUrl = signal<string | null>(null);
  readonly isDragging = signal<boolean>(false);

  /**
   * URL da mostrare in preview (nuovo upload o esistente)
   */
  readonly displayUrl = computed(() => {
    return this.previewUrl() || this.existingImageUrl();
  });

  /**
   * Verifica se c'è un'immagine da mostrare
   */
  readonly hasImage = computed(() => {
    return !!this.displayUrl();
  });

  /**
   * Classi CSS per l'area di drop
   */
  readonly dropzoneClasses = computed(() => {
    const base =
      'relative flex flex-col items-center justify-center border-[2px] border-dashed rounded-[20px] transition-all duration-300 backdrop-blur-md group cursor-pointer';

    if (this.isDragging()) {
      return `${base} border-primary-500 bg-primary-50/80 dark:bg-primary-900/40 scale-[0.98] shadow-inner`;
    }

    if (this.uploadState() === 'error') {
      return `${base} border-error-400 bg-error-50/80 dark:bg-error-900/30`;
    }

    return `${base} border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-gray-800/30 hover:border-primary-400 dark:hover:border-primary-500 hover:bg-white/80 dark:hover:bg-gray-800/60 hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.1)] hover:-translate-y-0.5`;
  });

  /**
   * Apre il file picker
   */
  openFilePicker(): void {
    this.fileInput()?.nativeElement.click();
  }

  /**
   * Gestisce la selezione file dall'input
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (file) {
      this.uploadFile(file);
    }

    // Reset input per permettere la selezione dello stesso file
    input.value = '';
  }

  /**
   * Gestisce il drag enter
   */
  onDragEnter(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    if (this.enableDragDrop()) {
      this.isDragging.set(true);
    }
  }

  /**
   * Gestisce il drag over
   */
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  /**
   * Gestisce il drag leave
   */
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  /**
   * Gestisce il drop del file
   */
  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    if (!this.enableDragDrop()) return;

    const file = event.dataTransfer?.files[0];
    if (file) {
      this.uploadFile(file);
    }
  }

  /**
   * Esegue l'upload del file
   */
  private uploadFile(file: File): void {
    // Reset stato
    this.uploadState.set('uploading');
    this.uploadProgress.set(0);
    this.errorMessage.set('');

    // Crea preview locale immediata
    this.createLocalPreview(file);

    // Esegue l'upload su Cloudinary
    this.storageService
      .uploadImage(file, this.imageType(), (progress) => {
        this.uploadProgress.set(progress);
      })
      .subscribe({
        next: (response) => {
          this.uploadState.set('success');
          this.uploadedImageUrl.set(response.secureUrl);
          this.uploadSuccess.emit(response.secureUrl);
        },
        error: (error) => {
          this.uploadState.set('error');
          this.previewUrl.set(null);

          const message =
            error instanceof UploadValidationError
              ? error.message
              : "Errore durante l'upload. Riprova.";

          this.errorMessage.set(message);
          this.uploadError.emit(message);
        },
      });
  }

  /**
   * Crea una preview locale del file
   */
  private createLocalPreview(file: File): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      this.previewUrl.set(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }

  /**
   * Rimuove l'immagine corrente
   */
  removeImage(): void {
    this.previewUrl.set(null);
    this.uploadedImageUrl.set(null);
    this.uploadState.set('idle');
    this.uploadProgress.set(0);
    this.errorMessage.set('');
    this.imageRemoved.emit();
  }
}
