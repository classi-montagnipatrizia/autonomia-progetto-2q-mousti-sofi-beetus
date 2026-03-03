import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  LucideAngularModule,
  ArrowLeft,
  Check,
  MessageCircle,
  AlertTriangle,
  BookOpen,
  User,
} from 'lucide-angular';

import { LibraryStore } from '../../../core/stores/library-store';
import { SkeletonComponent } from '../../../shared/ui/skeleton/skeleton-component/skeleton-component';
import { AvatarComponent } from '../../../shared/ui/avatar/avatar-component/avatar-component';
import { SpinnerComponent } from '../../../shared/ui/spinner/spinner-component/spinner-component';
import { BookCondition, BookListingStatus, BookSubject } from '../../../models';

@Component({
  selector: 'app-book-detail',
  imports: [
    CommonModule,
    LucideAngularModule,
    SkeletonComponent,
    AvatarComponent,
    SpinnerComponent,
  ],
  templateUrl: './book-detail.html',
  styleUrl: './book-detail.scss',
})
export class BookDetail implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly store = inject(LibraryStore);

  // Icons
  readonly ArrowLeftIcon = ArrowLeft;
  readonly CheckIcon = Check;
  readonly MessageCircleIcon = MessageCircle;
  readonly AlertTriangleIcon = AlertTriangle;
  readonly BookOpenIcon = BookOpen;
  readonly UserIcon = User;

  // Enums
  readonly BookCondition = BookCondition;
  readonly BookListingStatus = BookListingStatus;
  readonly BookSubject = BookSubject;

  // Computed helpers
  readonly book = this.store.bookDetail;
  readonly loading = this.store.bookDetailLoading;
  readonly requesting = this.store.bookRequesting;

  readonly conditionLabel = computed(() => {
    const book = this.book();
    if (!book) return '';
    switch (book.condizione) {
      case BookCondition.COME_NUOVO: return 'Come nuovo';
      case BookCondition.BUONE_CONDIZIONI: return 'Buone condizioni';
      case BookCondition.USATO: return 'Usato';
      default: return '';
    }
  });

  readonly conditionColor = computed(() => {
    const book = this.book();
    if (!book) return '';
    switch (book.condizione) {
      case BookCondition.COME_NUOVO: return 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400';
      case BookCondition.BUONE_CONDIZIONI: return 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400';
      case BookCondition.USATO: return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
      default: return '';
    }
  });

  readonly statusLabel = computed(() => {
    const book = this.book();
    if (!book) return '';
    switch (book.stato) {
      case BookListingStatus.DISPONIBILE: return 'Disponibile';
      case BookListingStatus.RICHIESTO: return 'Richiesto';
      case BookListingStatus.VENDUTO: return 'Venduto';
      default: return '';
    }
  });

  readonly statusColor = computed(() => {
    const book = this.book();
    if (!book) return '';
    switch (book.stato) {
      case BookListingStatus.DISPONIBILE: return 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400';
      case BookListingStatus.RICHIESTO: return 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400';
      case BookListingStatus.VENDUTO: return 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400';
      default: return '';
    }
  });

  readonly statusDotColor = computed(() => {
    const book = this.book();
    if (!book) return '';
    switch (book.stato) {
      case BookListingStatus.DISPONIBILE: return 'bg-primary-500';
      case BookListingStatus.RICHIESTO: return 'bg-warning-500';
      case BookListingStatus.VENDUTO: return 'bg-gray-400';
      default: return '';
    }
  });

  readonly subjectLabel = computed(() => {
    const book = this.book();
    if (!book) return '';
    switch (book.materia) {
      case BookSubject.MATEMATICA: return 'Matematica';
      case BookSubject.ITALIANO: return 'Italiano';
      case BookSubject.INGLESE: return 'Inglese';
      case BookSubject.STORIA: return 'Storia';
      case BookSubject.FISICA: return 'Fisica';
      case BookSubject.INFORMATICA: return 'Informatica';
      case BookSubject.ALTRO: return 'Altro';
      default: return '';
    }
  });

  readonly annoLabel = computed(() => {
    const book = this.book();
    if (!book) return '';
    return book.anno === 0 ? 'Tutti gli anni' : `${book.anno}° Anno`;
  });

  readonly isAvailable = computed(() => this.book()?.stato === BookListingStatus.DISPONIBILE);
  readonly isRequested = computed(() => this.book()?.stato === BookListingStatus.RICHIESTO);
  readonly hasRetroImage = computed(() => !!this.book()?.imageUrlRetro);

  readonly formattedDate = computed(() => {
    const book = this.book();
    if (!book) return '';
    const date = new Date(book.createdAt);
    return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
  });

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.store.loadBookDetail(id);
    }
  }

  ngOnDestroy(): void {
    this.store.clearBookDetail();
  }

  goBack(): void {
    this.router.navigate(['/library']);
  }

  async onRequestBook(): Promise<void> {
    const book = this.book();
    if (!book) return;
    await this.store.requestBook(book.id);
  }

  onContactSeller(): void {
    // Naviga alla libreria nel tab messaggi
    this.store.setActiveTab('messaggi');
    this.router.navigate(['/library']);
  }

  onViewProfile(): void {
    const book = this.book();
    if (!book) return;
    this.router.navigate(['/profile', book.venditore.id]);
  }
}
