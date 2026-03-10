import { Component, computed, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LucideAngularModule,
  X,
  Search,
  Plus,
  Pencil,
  Info,
} from 'lucide-angular';

import { ModalComponent } from '../../../shared/ui/modal/modal-component/modal-component';
import { AvatarComponent } from '../../../shared/ui/avatar/avatar-component/avatar-component';
import { SpinnerComponent } from '../../../shared/ui/spinner/spinner-component/spinner-component';
import {
  CreaGruppoRequestDTO,
  GroupColor,
  UserSummaryDTO,
} from '../../../models';

/** Colori disponibili per il gruppo */
interface ColorOption {
  value: GroupColor;
  from: string;
  to: string;
  ring: string;
}

/** Studente mock per i suggerimenti */
const MOCK_STUDENTS: UserSummaryDTO[] = [
  { id: 10, username: 'sara_g', nomeCompleto: 'Sara Gialli', profilePictureUrl: null, isOnline: true, classroom: '4IB' },
  { id: 11, username: 'fra_neri', nomeCompleto: 'Francesco Neri', profilePictureUrl: null, isOnline: false, classroom: '3IA' },
  { id: 12, username: 'marco_r', nomeCompleto: 'Marco Rossi', profilePictureUrl: null, isOnline: true, classroom: '5IA' },
  { id: 13, username: 'anna_b', nomeCompleto: 'Anna Bianchi', profilePictureUrl: null, isOnline: false, classroom: '4IA' },
  { id: 14, username: 'luca_v', nomeCompleto: 'Luca Verdi', profilePictureUrl: null, isOnline: true, classroom: '3IB' },
  { id: 15, username: 'giulia_m', nomeCompleto: 'Giulia Martini', profilePictureUrl: null, isOnline: false, classroom: '5IB' },
  { id: 16, username: 'davide_c', nomeCompleto: 'Davide Conti', profilePictureUrl: null, isOnline: true, classroom: '4IA' },
];

@Component({
  selector: 'app-create-group-modal',
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    ModalComponent,
    AvatarComponent,
    SpinnerComponent,
  ],
  templateUrl: './create-group-modal.html',
  styleUrl: './create-group-modal.scss',
})
export class CreateGroupModal {
  // =========================================================================
  // Inputs / Outputs
  // =========================================================================
  readonly isOpen = input<boolean>(false);
  readonly closed = output<void>();
  readonly submitted = output<CreaGruppoRequestDTO>();

  // Icons
  readonly XIcon = X;
  readonly SearchIcon = Search;
  readonly PlusIcon = Plus;
  readonly PencilIcon = Pencil;
  readonly InfoIcon = Info;

  // =========================================================================
  // Color options
  // =========================================================================
  readonly colorOptions: ColorOption[] = [
    { value: 'blue', from: 'from-blue-500', to: 'to-blue-600', ring: 'ring-blue-500' },
    { value: 'green', from: 'from-green-500', to: 'to-green-600', ring: 'ring-green-500' },
    { value: 'purple', from: 'from-purple-500', to: 'to-purple-600', ring: 'ring-purple-500' },
    { value: 'orange', from: 'from-orange-500', to: 'to-orange-600', ring: 'ring-orange-500' },
    { value: 'pink', from: 'from-pink-500', to: 'to-pink-600', ring: 'ring-pink-500' },
    { value: 'cyan', from: 'from-cyan-500', to: 'to-cyan-600', ring: 'ring-cyan-500' },
  ];

  // =========================================================================
  // Form state
  // =========================================================================
  readonly nome = signal('');
  readonly descrizione = signal('');
  readonly selectedColor = signal<GroupColor>('blue');
  readonly selectedMembers = signal<UserSummaryDTO[]>([]);
  readonly searchQuery = signal('');
  readonly submitting = signal(false);
  readonly searchLoading = signal(false);

  // =========================================================================
  // Computed
  // =========================================================================
  readonly groupInitials = computed(() => {
    const name = this.nome().trim();
    if (!name) return '??';
    const words = name.split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  });

  readonly activeColorOption = computed(() =>
    this.colorOptions.find((c) => c.value === this.selectedColor()) ?? this.colorOptions[0]
  );

  readonly filteredSuggestions = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const selectedIds = new Set(this.selectedMembers().map((m) => m.id));

    // Filtra gli studenti mock: escludi già selezionati, applica ricerca
    return MOCK_STUDENTS.filter((s) => {
      if (selectedIds.has(s.id)) return false;
      if (!query) return true;
      return (
        s.nomeCompleto.toLowerCase().includes(query) ||
        s.username.toLowerCase().includes(query) ||
        (s.classroom?.toLowerCase().includes(query) ?? false)
      );
    });
  });

  readonly isFormValid = computed(() => {
    return this.nome().trim().length > 0 && this.selectedMembers().length > 0;
  });

  // =========================================================================
  // Actions
  // =========================================================================
  selectColor(color: GroupColor): void {
    this.selectedColor.set(color);
  }

  addMember(user: UserSummaryDTO): void {
    this.selectedMembers.update((prev) => {
      if (prev.some((m) => m.id === user.id)) return prev;
      return [...prev, user];
    });
    this.searchQuery.set('');
  }

  removeMember(userId: number): void {
    this.selectedMembers.update((prev) => prev.filter((m) => m.id !== userId));
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);

    // Simula caricamento ricerca
    if (value.trim()) {
      this.searchLoading.set(true);
      setTimeout(() => this.searchLoading.set(false), 300);
    }
  }

  onClose(): void {
    this.resetForm();
    this.closed.emit();
  }

  onSubmit(): void {
    if (!this.isFormValid() || this.submitting()) return;

    this.submitting.set(true);

    const request: CreaGruppoRequestDTO = {
      nome: this.nome().trim(),
      descrizione: this.descrizione().trim() || undefined,
      colore: this.selectedColor(),
      membriIds: this.selectedMembers().map((m) => m.id),
    };

    this.submitted.emit(request);

    setTimeout(() => {
      this.submitting.set(false);
      this.resetForm();
    }, 500);
  }

  private resetForm(): void {
    this.nome.set('');
    this.descrizione.set('');
    this.selectedColor.set('blue');
    this.selectedMembers.set([]);
    this.searchQuery.set('');
    this.submitting.set(false);
    this.searchLoading.set(false);
  }
}
