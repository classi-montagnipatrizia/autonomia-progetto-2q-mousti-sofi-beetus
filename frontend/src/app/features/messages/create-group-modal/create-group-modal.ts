import { Component, computed, inject, input, output, signal } from '@angular/core';

import { FormsModule } from '@angular/forms';
import {
  LucideAngularModule,
  X,
  Search,
  Plus,
  Camera,
  Info,
} from 'lucide-angular';

import { ModalComponent } from '../../../shared/ui/modal/modal-component/modal-component';
import { AvatarComponent } from '../../../shared/ui/avatar/avatar-component/avatar-component';
import { SpinnerComponent } from '../../../shared/ui/spinner/spinner-component/spinner-component';
import { CloudinaryStorageService } from '../../../core/services/cloudinary-storage-service';
import { ToastService } from '../../../core/services/toast-service';
import { UserService } from '../../../core/api/user-service';
import { AuthStore } from '../../../core/stores/auth-store';
import {
  CreaGruppoRequestDTO,
  UserSummaryDTO,
} from '../../../models';

@Component({
  selector: 'app-create-group-modal',
  imports: [
    FormsModule,
    LucideAngularModule,
    ModalComponent,
    AvatarComponent,
    SpinnerComponent
],
  templateUrl: './create-group-modal.html',
  styleUrl: './create-group-modal.scss',
})
export class CreateGroupModal {
  private readonly cloudinary = inject(CloudinaryStorageService);
  private readonly toast = inject(ToastService);
  private readonly userService = inject(UserService);
  private readonly authStore = inject(AuthStore);

  // =========================================================================
  // Inputs / Outputs
  // =========================================================================
  readonly isOpen = input<boolean>(false);
  readonly closed = output<void>();
  readonly submitted = output<{ request: CreaGruppoRequestDTO; memberIds: number[] }>();

  // Icons
  readonly XIcon = X;
  readonly SearchIcon = Search;
  readonly PlusIcon = Plus;
  readonly CameraIcon = Camera;
  readonly InfoIcon = Info;

  // =========================================================================
  // Photo state
  // =========================================================================
  readonly profilePictureUrl = signal<string | null>(null);
  readonly uploadingPhoto = signal(false);

  // =========================================================================
  // Form state
  // =========================================================================
  readonly nome = signal('');
  readonly descrizione = signal('');
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

  readonly searchResults = signal<UserSummaryDTO[]>([]);

  readonly filteredSuggestions = computed(() => {
    const selectedIds = new Set(this.selectedMembers().map((m) => m.id));
    const currentUserId = this.authStore.userId();
    return this.searchResults().filter((s) => !selectedIds.has(s.id) && s.id !== currentUserId);
  });

  readonly isFormValid = computed(() => {
    return this.nome().trim().length > 0 && this.selectedMembers().length > 0;
  });

  // =========================================================================
  // Photo actions
  // =========================================================================
  triggerPhotoUpload(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) this.uploadPhoto(file);
    };
    input.click();
  }

  private uploadPhoto(file: File): void {
    this.uploadingPhoto.set(true);
    this.cloudinary.uploadImage(file, 'profile').subscribe({
      next: (response) => {
        this.profilePictureUrl.set(response.secureUrl);
        this.uploadingPhoto.set(false);
      },
      error: () => {
        this.toast.error('Errore durante il caricamento della foto');
        this.uploadingPhoto.set(false);
      },
    });
  }

  removePhoto(): void {
    this.profilePictureUrl.set(null);
  }

  // =========================================================================
  // Member actions
  // =========================================================================
  addMember(user: UserSummaryDTO): void {
    this.selectedMembers.update((prev) => {
      if (prev.some((m) => m.id === user.id)) return prev;
      return [...prev, user];
    });
    this.searchQuery.set('');
    this.searchResults.set([]);
  }

  removeMember(userId: number): void {
    this.selectedMembers.update((prev) => prev.filter((m) => m.id !== userId));
  }

  private searchDebounce?: ReturnType<typeof setTimeout>;

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);

    clearTimeout(this.searchDebounce);

    if (!value.trim()) {
      this.searchResults.set([]);
      this.searchLoading.set(false);
      return;
    }

    this.searchLoading.set(true);
    this.searchDebounce = setTimeout(() => {
      this.userService.searchUsers(value.trim(), 0, 20, 'username', true).subscribe({
        next: (page) => {
          const myId = this.authStore.userId();
          this.searchResults.set(page.content.filter(u => u.id !== myId));
          this.searchLoading.set(false);
        },
        error: () => {
          this.searchLoading.set(false);
        },
      });
    }, 300);
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
      profilePictureUrl: this.profilePictureUrl() ?? undefined,
    };

    const memberIds = this.selectedMembers().map((m) => m.id);
    this.submitted.emit({ request, memberIds });

    setTimeout(() => {
      this.submitting.set(false);
      this.resetForm();
    }, 500);
  }

  private resetForm(): void {
    this.nome.set('');
    this.descrizione.set('');
    this.profilePictureUrl.set(null);
    this.uploadingPhoto.set(false);
    this.selectedMembers.set([]);
    this.searchQuery.set('');
    this.searchResults.set([]);
    this.submitting.set(false);
    this.searchLoading.set(false);
  }
}
