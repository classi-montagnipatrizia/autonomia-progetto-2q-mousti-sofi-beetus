import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LucideAngularModule,
  X,
  Image,
  Sparkles,
  Check,
  TriangleAlert,
  Lightbulb,
} from 'lucide-angular';
import { firstValueFrom } from 'rxjs';

import { ModalComponent } from '../../../shared/ui/modal/modal-component/modal-component';
import { SpinnerComponent } from '../../../shared/ui/spinner/spinner-component/spinner-component';
import { CloudinaryStorageService } from '../../../core/services/cloudinary-storage-service';
import { AiService } from '../../../core/api/ai-service';
import { BookService } from '../../../core/api/book-service';
import { ToastService } from '../../../core/services/toast-service';
import {
  BookCondition,
  BookResponseDTO,
  CreaLibroRequestDTO,
  ModificaLibroRequestDTO,
} from '../../../models';

/** Stato dell'analisi AI */
type AiStatus = 'idle' | 'loading' | 'success' | 'error';

@Component({
  selector: 'app-sell-book-modal',
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    ModalComponent,
    SpinnerComponent,
  ],
  templateUrl: './sell-book-modal.html',
  styleUrl: './sell-book-modal.scss',
})
export class SellBookModal {
  private readonly cloudinary = inject(CloudinaryStorageService);
  private readonly aiService = inject(AiService);
  private readonly bookService = inject(BookService);
  private readonly toast = inject(ToastService);

  // =========================================================================
  // Inputs / Outputs
  // =========================================================================
  readonly isOpen = input<boolean>(false);
  readonly editBook = input<BookResponseDTO | null>(null);
  readonly closed = output<void>();
  readonly submitted = output<BookResponseDTO>();

  // Icons
  readonly XIcon = X;
  readonly ImageIcon = Image;
  readonly SparklesIcon = Sparkles;
  readonly CheckIcon = Check;
  readonly AlertTriangleIcon = TriangleAlert;
  readonly LightbulbIcon = Lightbulb;

  // =========================================================================
  // Photo state
  // =========================================================================
  readonly frontPhoto = signal<string | null>(null);
  readonly backPhoto = signal<string | null>(null);
  readonly uploadingFront = signal(false);
  readonly uploadingBack = signal(false);
  readonly uploadProgressFront = signal(0);
  readonly uploadProgressBack = signal(0);

  readonly hasPhotos = computed(() => !!this.frontPhoto());

  // =========================================================================
  // AI state
  // =========================================================================
  readonly aiStatus = signal<AiStatus>('idle');
  readonly aiGenerated = computed(() => this.aiStatus() === 'success');
  readonly isEditMode = computed(() => !!this.editBook());

  // =========================================================================
  // Form fields
  // =========================================================================
  readonly titolo = signal('');
  readonly autore = signal('');
  readonly isbn = signal('');
  readonly anno = signal<string>('');
  readonly materia = signal<string>('');
  readonly condizione = signal<string>('');
  readonly prezzo = signal<number | null>(null);
  readonly descrizione = signal('');
  readonly submitting = signal(false);

  // =========================================================================
  // Options
  // =========================================================================
  readonly anniOptions = [
    { value: '1', label: '1° Anno' },
    { value: '2', label: '2° Anno' },
    { value: '3', label: '3° Anno' },
    { value: '4', label: '4° Anno' },
    { value: '5', label: '5° Anno' },
  ];

  readonly materieOptions = [
    { value: 'Matematica', label: 'Matematica' },
    { value: 'Italiano', label: 'Italiano' },
    { value: 'Inglese', label: 'Inglese' },
    { value: 'Storia', label: 'Storia' },
    { value: 'Fisica', label: 'Fisica' },
    { value: 'Informatica', label: 'Informatica' },
    { value: 'Altro', label: 'Altro' },
  ];

  readonly condizioneOptions = [
    { value: BookCondition.OTTIMO, label: 'Ottimo' },
    { value: BookCondition.BUONO, label: 'Buono' },
    { value: BookCondition.ACCETTABILE, label: 'Accettabile' },
  ];

  // Validazione
  readonly isFormValid = computed(() =>
    this.titolo().trim().length > 0 &&
    this.autore().trim().length > 0 &&
    this.anno() !== '' &&
    this.materia() !== '' &&
    this.condizione() !== '' &&
    this.prezzo() != null &&
    this.prezzo()! > 0 &&
    this.frontPhoto() != null
  );

  readonly descrizioneLength = computed(() => this.descrizione().length);

  constructor() {
    effect(() => {
      const isOpen = this.isOpen();
      const book = this.editBook();
      if (!isOpen) return;

      if (book) {
        this.populateFormFromBook(book);
      } else {
        this.resetForm();
      }
    });
  }

  // =========================================================================
  // Photo actions — upload reale su Cloudinary
  // =========================================================================
  triggerFrontUpload(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) this.uploadPhoto(file, 'front');
    };
    input.click();
  }

  triggerBackUpload(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) this.uploadPhoto(file, 'back');
    };
    input.click();
  }

  private uploadPhoto(file: File, side: 'front' | 'back'): void {
    if (side === 'front') {
      this.uploadingFront.set(true);
      this.uploadProgressFront.set(0);
    } else {
      this.uploadingBack.set(true);
      this.uploadProgressBack.set(0);
    }

    this.cloudinary.uploadImage(file, 'message', (progress) => {
      if (side === 'front') this.uploadProgressFront.set(progress);
      else this.uploadProgressBack.set(progress);
    }).subscribe({
      next: (response) => {
        const url = response.secureUrl;
        if (side === 'front') {
          this.frontPhoto.set(url);
          this.uploadingFront.set(false);
          // Reset AI se cambia la foto fronte
          if (this.aiStatus() !== 'idle') this.aiStatus.set('idle');
        } else {
          this.backPhoto.set(url);
          this.uploadingBack.set(false);
        }
      },
      error: (err) => {
        this.toast.error('Errore durante il caricamento della foto');
        if (side === 'front') this.uploadingFront.set(false);
        else this.uploadingBack.set(false);
      },
    });
  }

  removeFrontPhoto(): void {
    const url = this.frontPhoto();
    if (url) {
      // Cleanup Cloudinary in background (best effort)
      this.bookService.deleteImages(url).subscribe();
    }
    this.frontPhoto.set(null);
    if (this.aiStatus() !== 'idle') this.aiStatus.set('idle');
  }

  removeBackPhoto(): void {
    const url = this.backPhoto();
    if (url) {
      this.bookService.deleteImages(url).subscribe();
    }
    this.backPhoto.set(null);
  }

  // =========================================================================
  // AI — analisi reale con Gemini
  // =========================================================================
  generateWithAI(): void {
    const front = this.frontPhoto();
    if (!front || this.aiStatus() === 'loading') return;

    this.aiStatus.set('loading');

    this.aiService.analizzaLibro(front, this.backPhoto() ?? undefined).subscribe({
      next: (result) => {
        if (result.titolo) this.titolo.set(result.titolo);
        if (result.autore) this.autore.set(result.autore);
        if (result.isbn) this.isbn.set(result.isbn);
        if (result.annoScolastico) this.anno.set(result.annoScolastico);
        if (result.materia) this.materia.set(result.materia);
        if (result.condizione) this.condizione.set(result.condizione);
        if (result.prezzo != null) this.prezzo.set(result.prezzo);
        if (result.descrizione) this.descrizione.set(result.descrizione);
        this.aiStatus.set('success');
      },
      error: () => {
        this.aiStatus.set('error');
      },
    });
  }

  retryAI(): void {
    this.generateWithAI();
  }

  // =========================================================================
  // Form actions
  // =========================================================================
  onClose(): void {
    if (this.isEditMode()) {
      this.resetForm();
      this.closed.emit();
      return;
    }

    // Cleanup immagini già caricate se si annulla
    const front = this.frontPhoto();
    const back = this.backPhoto();
    if (front) {
      this.bookService.deleteImages(front, back ?? undefined).subscribe();
    }
    this.resetForm();
    this.closed.emit();
  }

  async onSubmit(): Promise<void> {
    if (!this.isFormValid() || this.submitting()) return;

    this.submitting.set(true);
    try {
      if (this.isEditMode()) {
        const editing = this.editBook();
        if (!editing) return;

        const request: ModificaLibroRequestDTO = {
          titolo: this.titolo().trim(),
          autore: this.autore().trim(),
          isbn: this.isbn().trim() || undefined,
          annoScolastico: this.anno(),
          materia: this.materia(),
          condizione: this.condizione() as BookCondition,
          prezzo: this.prezzo()!,
          descrizione: this.descrizione().trim() || undefined,
          frontImageUrl: this.frontPhoto()!,
          backImageUrl: this.backPhoto() ?? undefined,
        };

        const updated = await firstValueFrom(this.bookService.modificaLibro(editing.id, request));
        this.toast.success('Annuncio aggiornato con successo!');
        this.submitted.emit(updated);
      } else {
        const request: CreaLibroRequestDTO = {
          titolo: this.titolo().trim(),
          autore: this.autore().trim(),
          isbn: this.isbn().trim() || undefined,
          annoScolastico: this.anno(),
          materia: this.materia(),
          condizione: this.condizione() as BookCondition,
          prezzo: this.prezzo()!,
          descrizione: this.descrizione().trim() || undefined,
          frontImageUrl: this.frontPhoto()!,
          backImageUrl: this.backPhoto() ?? undefined,
        };

        const created = await firstValueFrom(this.bookService.creaLibro(request));
        this.toast.success('Annuncio pubblicato con successo!');
        this.submitted.emit(created);
      }

      this.resetForm();
    } catch {
      this.toast.error(this.isEditMode() ? 'Errore durante la modifica. Riprova.' : 'Errore durante la pubblicazione. Riprova.');
    } finally {
      this.submitting.set(false);
    }
  }

  private resetForm(): void {
    this.frontPhoto.set(null);
    this.backPhoto.set(null);
    this.uploadingFront.set(false);
    this.uploadingBack.set(false);
    this.uploadProgressFront.set(0);
    this.uploadProgressBack.set(0);
    this.aiStatus.set('idle');
    this.titolo.set('');
    this.autore.set('');
    this.isbn.set('');
    this.anno.set('');
    this.materia.set('');
    this.condizione.set('');
    this.prezzo.set(null);
    this.descrizione.set('');
    this.submitting.set(false);
  }

  private populateFormFromBook(book: BookResponseDTO): void {
    this.frontPhoto.set(book.frontImageUrl ?? null);
    this.backPhoto.set(book.backImageUrl ?? null);
    this.uploadingFront.set(false);
    this.uploadingBack.set(false);
    this.uploadProgressFront.set(0);
    this.uploadProgressBack.set(0);
    this.aiStatus.set('idle');
    this.titolo.set(book.titolo ?? '');
    this.autore.set(book.autore ?? '');
    this.isbn.set(book.isbn ?? '');
    this.anno.set(book.annoScolastico ?? '');
    this.materia.set(book.materia ?? '');
    this.condizione.set(book.condizione ?? '');
    this.prezzo.set(book.prezzo ?? null);
    this.descrizione.set(book.descrizione ?? '');
    this.submitting.set(false);
  }
}
