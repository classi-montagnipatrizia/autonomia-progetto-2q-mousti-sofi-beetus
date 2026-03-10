import { Component, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LucideAngularModule,
  X,
  Image,
  Sparkles,
  Check,
  AlertTriangle,
  Lightbulb,
} from 'lucide-angular';

import { ModalComponent } from '../../../shared/ui/modal/modal-component/modal-component';
import { SpinnerComponent } from '../../../shared/ui/spinner/spinner-component/spinner-component';
import {
  BookCondition,
  BookSubject,
  CreaBookListingRequestDTO,
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
  // =========================================================================
  // Inputs / Outputs
  // =========================================================================
  readonly isOpen = input<boolean>(false);
  readonly closed = output<void>();
  readonly submitted = output<CreaBookListingRequestDTO>();

  // Icons
  readonly XIcon = X;
  readonly ImageIcon = Image;
  readonly SparklesIcon = Sparkles;
  readonly CheckIcon = Check;
  readonly AlertTriangleIcon = AlertTriangle;
  readonly LightbulbIcon = Lightbulb;

  // =========================================================================
  // Photo state
  // =========================================================================
  readonly frontPhoto = signal<string | null>(null);
  readonly backPhoto = signal<string | null>(null);
  readonly uploadingFront = signal(false);
  readonly uploadingBack = signal(false);

  readonly hasPhotos = computed(() => !!this.frontPhoto());

  // =========================================================================
  // AI state
  // =========================================================================
  readonly aiStatus = signal<AiStatus>('idle');
  readonly aiGenerated = computed(() => this.aiStatus() === 'success');

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
    { value: '0', label: 'Tutti gli anni' },
  ];

  readonly materieOptions = [
    { value: BookSubject.MATEMATICA, label: 'Matematica' },
    { value: BookSubject.ITALIANO, label: 'Italiano' },
    { value: BookSubject.INGLESE, label: 'Inglese' },
    { value: BookSubject.STORIA, label: 'Storia' },
    { value: BookSubject.FISICA, label: 'Fisica' },
    { value: BookSubject.INFORMATICA, label: 'Informatica' },
    { value: BookSubject.ALTRO, label: 'Altro' },
  ];

  readonly condizioneOptions = [
    { value: BookCondition.COME_NUOVO, label: 'Come nuovo' },
    { value: BookCondition.BUONE_CONDIZIONI, label: 'Buone condizioni' },
    { value: BookCondition.USATO, label: 'Usato' },
  ];

  // Validazione
  readonly isFormValid = computed(() => {
    return (
      this.titolo().trim().length > 0 &&
      this.autore().trim().length > 0 &&
      this.anno() !== '' &&
      this.materia() !== '' &&
      this.condizione() !== '' &&
      this.prezzo() != null &&
      this.prezzo()! > 0 &&
      this.frontPhoto() != null
    );
  });

  readonly descrizioneLength = computed(() => this.descrizione().length);

  // =========================================================================
  // Photo actions
  // =========================================================================
  triggerFrontUpload(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) this.simulateUpload(file, 'front');
    };
    input.click();
  }

  triggerBackUpload(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) this.simulateUpload(file, 'back');
    };
    input.click();
  }

  private simulateUpload(file: File, side: 'front' | 'back'): void {
    if (side === 'front') this.uploadingFront.set(true);
    else this.uploadingBack.set(true);

    // Simula upload con URL locale
    const reader = new FileReader();
    reader.onload = () => {
      setTimeout(() => {
        const url = reader.result as string;
        if (side === 'front') {
          this.frontPhoto.set(url);
          this.uploadingFront.set(false);
        } else {
          this.backPhoto.set(url);
          this.uploadingBack.set(false);
        }
      }, 800);
    };
    reader.readAsDataURL(file);
  }

  removeFrontPhoto(): void {
    this.frontPhoto.set(null);
    // Se rimuoviamo la foto front, resetta AI
    if (this.aiStatus() !== 'idle') {
      this.aiStatus.set('idle');
    }
  }

  removeBackPhoto(): void {
    this.backPhoto.set(null);
  }

  // =========================================================================
  // AI generation
  // =========================================================================
  generateWithAI(): void {
    if (!this.hasPhotos() || this.aiStatus() === 'loading') return;

    this.aiStatus.set('loading');

    // Simula risposta AI dopo 2 secondi
    setTimeout(() => {
      // Mock: compila i campi come generati dall'AI
      this.titolo.set('Matematica Blu 2.0 - Volume 3');
      this.autore.set('Bergamini, Barozzi, Trifone');
      this.isbn.set('9788808537010');
      this.anno.set('3');
      this.materia.set(BookSubject.MATEMATICA);
      this.condizione.set(BookCondition.COME_NUOVO);
      this.prezzo.set(15);
      this.descrizione.set(
        'Libro in ottime condizioni, usato per un solo anno scolastico. Nessuna sottolineatura o appunti. Copertina integra, senza pieghe o strappi.'
      );
      this.aiStatus.set('success');
    }, 2000);
  }

  retryAI(): void {
    this.generateWithAI();
  }

  // =========================================================================
  // Form actions
  // =========================================================================
  onClose(): void {
    this.resetForm();
    this.closed.emit();
  }

  onSubmit(): void {
    if (!this.isFormValid() || this.submitting()) return;

    this.submitting.set(true);

    const request: CreaBookListingRequestDTO = {
      titolo: this.titolo().trim(),
      autore: this.autore().trim(),
      isbn: this.isbn().trim() || undefined,
      anno: parseInt(this.anno()),
      materia: this.materia() as BookSubject,
      condizione: this.condizione() as BookCondition,
      prezzo: this.prezzo()!,
      descrizione: this.descrizione().trim() || undefined,
      imageUrl: this.frontPhoto() || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400',
      imageUrlRetro: this.backPhoto() || undefined,
    };

    this.submitted.emit(request);

    // Il parent chiuderà il modal dopo il submit
    setTimeout(() => {
      this.submitting.set(false);
      this.resetForm();
    }, 500);
  }

  private resetForm(): void {
    this.frontPhoto.set(null);
    this.backPhoto.set(null);
    this.uploadingFront.set(false);
    this.uploadingBack.set(false);
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
}
