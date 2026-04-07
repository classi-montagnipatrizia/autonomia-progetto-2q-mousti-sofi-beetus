import { Component, computed, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  LucideAngularModule,
  ArrowLeft,
  Check,
  X,
  MessageCircle,
  TriangleAlert,
  BookOpen,
  Users,
} from 'lucide-angular';

import { LibraryStore } from '../../../core/stores/library-store';
import { ToastService } from '../../../core/services/toast-service';
import { SkeletonComponent } from '../../../shared/ui/skeleton/skeleton-component/skeleton-component';
import { AvatarComponent } from '../../../shared/ui/avatar/avatar-component/avatar-component';
import { SpinnerComponent } from '../../../shared/ui/spinner/spinner-component/spinner-component';
import { BookCondition, BookStatus, BookRequestStatus } from '../../../models';

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
  private readonly toast = inject(ToastService);
  readonly store = inject(LibraryStore);

  // Icons
  readonly ArrowLeftIcon = ArrowLeft;
  readonly CheckIcon = Check;
  readonly XIcon = X;
  readonly MessageCircleIcon = MessageCircle;
  readonly AlertTriangleIcon = TriangleAlert;
  readonly BookOpenIcon = BookOpen;
  readonly UsersIcon = Users;

  // Enums accessibili nel template
  readonly BookCondition = BookCondition;
  readonly BookStatus = BookStatus;
  readonly BookRequestStatus = BookRequestStatus;

  // Dati dal store
  readonly book = this.store.bookDetail;
  readonly loading = this.store.bookDetailLoading;
  readonly requesting = this.store.bookRequesting;

  // =========================================================================
  // Computed
  // =========================================================================

  readonly conditionLabel = computed(() => {
    switch (this.book()?.condizione) {
      case BookCondition.OTTIMO: return 'Ottimo';
      case BookCondition.BUONO: return 'Buono';
      case BookCondition.ACCETTABILE: return 'Accettabile';
      default: return '';
    }
  });

  readonly conditionColor = computed(() => {
    switch (this.book()?.condizione) {
      case BookCondition.OTTIMO: return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case BookCondition.BUONO: return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case BookCondition.ACCETTABILE: return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      default: return '';
    }
  });

  readonly statusLabel = computed(() => {
    switch (this.book()?.stato) {
      case BookStatus.DISPONIBILE: return 'Disponibile';
      case BookStatus.VENDUTO: return 'Venduto';
      default: return '';
    }
  });

  readonly statusColor = computed(() => {
    switch (this.book()?.stato) {
      case BookStatus.DISPONIBILE: return 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400';
      case BookStatus.VENDUTO: return 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400';
      default: return '';
    }
  });

  readonly statusDotColor = computed(() => {
    switch (this.book()?.stato) {
      case BookStatus.DISPONIBILE: return 'bg-primary-500';
      case BookStatus.VENDUTO: return 'bg-gray-400';
      default: return '';
    }
  });

  readonly annoLabel = computed(() => this.book()?.annoScolastico ?? '');
  readonly subjectLabel = computed(() => this.book()?.materia ?? '');
  readonly hasRetroImage = computed(() => !!this.book()?.backImageUrl);

  /** L'utente corrente ha già una richiesta PENDING su questo libro */
  readonly hoGiaRichiesto = computed(() =>
    this.book()?.miaRichiesta === BookRequestStatus.PENDING
  );

  /** Il libro è ancora richiedibile (non VENDUTO e non già richiesto da me) */
  readonly canRequest = computed(() =>
    this.book()?.stato !== BookStatus.VENDUTO && !this.hoGiaRichiesto()
  );

  /** Il libro è venduto */
  readonly isVenduto = computed(() => this.book()?.stato === BookStatus.VENDUTO);

  readonly formattedDate = computed(() => {
    const book = this.book();
    if (!book) return '';
    return new Date(book.createdAt).toLocaleDateString('it-IT', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  });

  // =========================================================================
  // Lifecycle
  // =========================================================================

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) this.store.loadBookDetail(id);
  }

  ngOnDestroy(): void {
    this.store.clearBookDetail();
  }

  // =========================================================================
  // Azioni
  // =========================================================================

  goBack(): void {
    this.router.navigate(['/library']);
  }

  async onRequestBook(): Promise<void> {
    const book = this.book();
    if (!book) return;
    try {
      await this.store.requestBook(book.id);
      this.toast.success('Richiesta inviata al venditore!');
    } catch {
      this.toast.error('Errore durante la richiesta. Riprova.');
    }
  }

  async onAnnullaRichiesta(): Promise<void> {
    const book = this.book();
    if (!book) return;
    try {
      await this.store.annullaRichiestaLibro(book.id);
      this.toast.success('Richiesta annullata.');
    } catch {
      this.toast.error('Errore durante l\'annullamento. Riprova.');
    }
  }

  onContactSeller(): void {
    const book = this.book();
    if (!book) return;
    this.router.navigate(['/library', 'conversation', book.id]);
  }

  onViewProfile(): void {
    const book = this.book();
    if (!book) return;
    this.router.navigate(['/profile', book.venditore.id]);
  }
}
