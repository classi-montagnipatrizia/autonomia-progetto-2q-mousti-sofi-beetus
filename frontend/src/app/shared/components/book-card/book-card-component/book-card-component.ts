import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, MapPin, Tag, BookOpen } from 'lucide-angular';
import { BookSummaryDTO, BookCondition, BookStatus } from '../../../../models';

@Component({
  selector: 'app-book-card-component',
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './book-card-component.html',
  styleUrl: './book-card-component.scss',
})
export class BookCardComponent {
  readonly MapPinIcon = MapPin;
  readonly TagIcon = Tag;
  readonly BookOpenIcon = BookOpen;

  /**
   * Dati del libro da visualizzare
   */
  readonly book = input.required<BookSummaryDTO>();

  /**
   * Rende la card cliccabile
   * @default true
   */
  readonly clickable = input<boolean>(true);

  /**
   * Emesso quando si clicca sulla card
   */
  readonly clicked = output<BookSummaryDTO>();

  /**
   * Emesso quando si clicca su "Richiedi"
   */
  readonly requested = output<BookSummaryDTO>();

  readonly conditionLabel = computed(() => {
    switch (this.book().condizione) {
      case BookCondition.OTTIMO:      return 'Ottimo';
      case BookCondition.BUONO:       return 'Buono';
      case BookCondition.ACCETTABILE: return 'Accettabile';
    }
  });

  readonly conditionClasses = computed(() => {
    switch (this.book().condizione) {
      case BookCondition.OTTIMO:
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
      case BookCondition.BUONO:
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300';
      case BookCondition.ACCETTABILE:
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
    }
  });

  readonly isAvailable = computed(() => this.book().stato === BookStatus.DISPONIBILE);

  readonly statusLabel = computed(() => {
    switch (this.book().stato) {
      case BookStatus.DISPONIBILE: return null; // non mostriamo nulla se disponibile
      case BookStatus.VENDUTO:     return 'Venduto';
    }
  });

  onCardClick(): void {
    if (this.clickable()) this.clicked.emit(this.book());
  }

  onRequest(event: Event): void {
    event.stopPropagation();
    this.requested.emit(this.book());
  }
}
