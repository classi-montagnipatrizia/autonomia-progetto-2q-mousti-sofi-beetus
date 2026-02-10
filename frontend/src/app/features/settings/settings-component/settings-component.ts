import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  LucideAngularModule,
  ArrowLeft,
  User,
  Lock,
  Palette,
  Power,
  Camera,
  Save,
  Eye,
  EyeOff,
  Check,
  TriangleAlert,
  Sun,
  Moon,
  Monitor,
} from 'lucide-angular';
import { Subject, takeUntil, finalize, Observable } from 'rxjs';

import { UserService } from '../../../core/api/user-service';
import { AuthStore } from '../../../core/stores/auth-store';
import { ThemeStore, Theme } from '../../../core/stores/theme-store';
import { AuthService } from '../../../core/auth/services/auth-service';
import { ToastService } from '../../../core/services/toast-service';
import { DialogService } from '../../../core/services/dialog-service';
import { CloudinaryStorageService } from '../../../core/services/cloudinary-storage-service';
import { LoggerService } from '../../../core/services/logger.service';
import { AvatarComponent } from '../../../shared/ui/avatar/avatar-component/avatar-component';
import { ButtonComponent } from '../../../shared/ui/button/button-component/button-component';
import { AggiornaProfiloRequestDTO, CambiaPasswordRequestDTO, DisattivaAccountRequestDTO } from '../../../models';

type SettingsSection = 'profile' | 'password' | 'theme' | 'account';
type ThemeMode = Theme | 'system';

@Component({
  selector: 'app-settings-component',
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    AvatarComponent,
    ButtonComponent,
  ],
  templateUrl: './settings-component.html',
  styleUrl: './settings-component.scss',
})
export class SettingsComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly userService = inject(UserService);
  private readonly authStore = inject(AuthStore);
  private readonly themeStore = inject(ThemeStore);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly dialogService = inject(DialogService);
  private readonly cloudinaryService = inject(CloudinaryStorageService);
  private readonly destroy$ = new Subject<void>();
  private readonly logger = inject(LoggerService);

  // Icone
  readonly ArrowLeftIcon = ArrowLeft;
  readonly UserIcon = User;
  readonly LockIcon = Lock;
  readonly PaletteIcon = Palette;
  readonly PowerIcon = Power;
  readonly CameraIcon = Camera;
  readonly SaveIcon = Save;
  readonly EyeIcon = Eye;
  readonly EyeOffIcon = EyeOff;
  readonly CheckIcon = Check;
  readonly AlertTriangleIcon = TriangleAlert;
  readonly SunIcon = Sun;
  readonly MoonIcon = Moon;
  readonly MonitorIcon = Monitor;

  // State
  readonly activeSection = signal<SettingsSection>('profile');
  readonly isSaving = signal(false);

  // Profile form
  readonly nomeCompleto = signal('');
  readonly bio = signal('');
  readonly profilePictureUrl = signal<string | null>(null);
  readonly isUploadingImage = signal(false);

  // Stato per gestire modifiche immagine in sospeso
  private pendingImageFile: File | null = null;
  private originalProfilePictureUrl: string | null = null;
  private imageMarkedForDeletion = false;

  // Password form
  readonly vecchiaPassword = signal('');
  readonly nuovaPassword = signal('');
  readonly confermaPassword = signal('');
  readonly showOldPassword = signal(false);
  readonly showNewPassword = signal(false);
  readonly showConfirmPassword = signal(false);

  // Theme
  readonly currentTheme = signal<ThemeMode>('light');

  // Deactivate form
  readonly deactivatePassword = signal('');
  readonly showDeactivatePassword = signal(false);

  // Computed
  readonly currentUser = computed(() => this.authStore.currentUser());
  
  readonly passwordsMatch = computed(() => {
    const nuova = this.nuovaPassword();
    const conferma = this.confermaPassword();
    return nuova === conferma;
  });

  readonly isPasswordValid = computed(() => {
    const nuova = this.nuovaPassword();
    return nuova.length >= 8;
  });

  readonly canSavePassword = computed(() => {
    return this.vecchiaPassword().length > 0 &&
           this.isPasswordValid() &&
           this.passwordsMatch();
  });

  readonly canDeactivate = computed(() => {
    return this.deactivatePassword().length > 0;
  });

  readonly sections: { id: SettingsSection; label: string; icon: typeof User }[] = [
    { id: 'profile', label: 'Profilo', icon: User },
    { id: 'password', label: 'Password', icon: Lock },
    { id: 'theme', label: 'Tema', icon: Palette },
    { id: 'account', label: 'Account', icon: Power },
  ];

  ngOnInit(): void {
    this.loadUserData();
    this.loadThemePreference();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Carica i dati utente correnti
   */
  private loadUserData(): void {
    const user = this.currentUser();
    if (user) {
      this.nomeCompleto.set(user.nomeCompleto);
      this.bio.set(user.bio || '');
      this.profilePictureUrl.set(user.profilePictureUrl);
      this.originalProfilePictureUrl = user.profilePictureUrl;
      this.pendingImageFile = null;
      this.imageMarkedForDeletion = false;
    }
  }

  /**
   * Carica la preferenza tema dal ThemeStore
   */
  private loadThemePreference(): void {
    // Controlla se c'è una preferenza salvata
    if (this.themeStore.hasSavedPreference()) {
      // Usa la preferenza salvata
      this.currentTheme.set(this.themeStore.currentTheme());
    } else {
      // Nessuna preferenza salvata, usa 'system'
      this.currentTheme.set('system');
      // Ma applica comunque la preferenza di sistema
      const systemTheme = this.themeStore.getSystemThemePreference();
      this.themeStore.setTheme(systemTheme);
    }
  }

  /**
   * Cambia sezione attiva
   */
  setSection(section: SettingsSection): void {
    this.activeSection.set(section);
  }

  /**
   * Salva modifiche profilo
   */
  saveProfile(): void {
    this.isSaving.set(true);

    // 1. Prima gestisci le operazioni Cloudinary
    this.handleCloudinaryOperations().subscribe({
      next: (finalImageUrl: string | null) => {
        // 2. Poi salva il profilo con l'URL finale
        const request: AggiornaProfiloRequestDTO = {
          nomeCompleto: this.nomeCompleto(),
          bio: this.bio() || undefined,
          profilePictureUrl: finalImageUrl || undefined,
        };

        this.userService.updateProfile(request)
          .pipe(
            takeUntil(this.destroy$),
            finalize(() => this.isSaving.set(false))
          )
          .subscribe({
            next: (updatedUser) => {
              this.authStore.updateUser(updatedUser);
              this.toastService.success('Profilo aggiornato con successo');

              // Reset stato modifiche in sospeso
              this.originalProfilePictureUrl = updatedUser.profilePictureUrl;
              this.pendingImageFile = null;
              this.imageMarkedForDeletion = false;
            },
            error: () => {
              this.toastService.error('Errore durante il salvataggio');
            }
          });
      },
      error: (error: { message?: string }) => {
        this.isSaving.set(false);
        const message = error.message || 'Errore durante la gestione dell\'immagine';
        this.toastService.error(message);
      }
    });
  }

  /**
   * Gestisce upload/delete su Cloudinary prima di salvare il profilo
   */
  private handleCloudinaryOperations(): Observable<string | null> {
    return new Observable<string | null>((observer) => {
      // Caso 1: Nuova immagine da uploadare
      if (this.pendingImageFile) {
        this.cloudinaryService.uploadImage(this.pendingImageFile, 'profile', () => {})
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (response) => {
              // Se c'era una vecchia immagine su Cloudinary, eliminala
              if (this.originalProfilePictureUrl?.includes('cloudinary.com')) {
                this.cloudinaryService.deleteImage(this.originalProfilePictureUrl)
                  .pipe(takeUntil(this.destroy$))
                  .subscribe({
                    next: () => observer.next(response.secureUrl),
                    error: () => {
                      // Anche se delete fallisce, procedi con il nuovo URL
                      this.logger.warn('Impossibile eliminare la vecchia immagine da Cloudinary');
                      observer.next(response.secureUrl);
                    },
                    complete: () => observer.complete()
                  });
              } else {
                observer.next(response.secureUrl);
                observer.complete();
              }
            },
            error: (error) => observer.error(error)
          });
      }
      // Caso 2: Immagine marcata per eliminazione (senza nuova immagine)
      else if (this.imageMarkedForDeletion && this.originalProfilePictureUrl?.includes('cloudinary.com')) {
        this.cloudinaryService.deleteImage(this.originalProfilePictureUrl)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              observer.next(null);
              observer.complete();
            },
            error: () => {
              // Anche se delete fallisce, rimuovi l'URL dal profilo
              this.logger.warn('Impossibile eliminare l\'immagine da Cloudinary, ma l\'URL verrà rimosso dal profilo');
              observer.next(null);
              observer.complete();
            }
          });
      }
      // Caso 3: Nessuna modifica all'immagine
      else {
        observer.next(this.profilePictureUrl());
        observer.complete();
      }
    });
  }

  /**
   * Gestisce selezione immagine profilo (solo preview locale)
   */
  onImageUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    // Validazione tipo file
    if (!file.type.startsWith('image/')) {
      this.toastService.error('Seleziona un file immagine valido');
      input.value = '';
      return;
    }

    // Validazione dimensione (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      this.toastService.error('L\'immagine deve essere inferiore a 5MB');
      input.value = '';
      return;
    }

    // Salva il file in attesa e crea preview locale
    this.pendingImageFile = file;
    this.imageMarkedForDeletion = false;

    // Crea URL preview locale
    const reader = new FileReader();
    reader.onload = (e) => {
      this.profilePictureUrl.set(e.target?.result as string);
      this.toastService.info('Immagine selezionata. Clicca su "Salva modifiche" per confermare.');
    };
    reader.readAsDataURL(file);

    // Reset input per permettere ri-caricamento stesso file
    input.value = '';
  }

  /**
   * Rimuove immagine profilo (solo rimozione locale)
   */
  async removeProfileImage(): Promise<void> {
    const currentUrl = this.profilePictureUrl();

    if (!currentUrl) return;

    // Conferma eliminazione
    const confirmed = await this.dialogService.confirm({
      title: 'Rimuovi foto profilo',
      message: 'Sei sicuro di voler rimuovere la foto profilo?',
      confirmText: 'Rimuovi',
      cancelText: 'Annulla',
    });

    if (!confirmed) return;

    // Rimuovi solo localmente
    this.profilePictureUrl.set(null);
    this.pendingImageFile = null;

    // Se c'era una foto originale, marcala per eliminazione
    if (this.originalProfilePictureUrl) {
      this.imageMarkedForDeletion = true;
    }

    this.toastService.info('Foto profilo rimossa. Clicca su "Salva modifiche" per confermare.');
  }

  /**
   * Cambia password
   */
  changePassword(): void {
    if (!this.canSavePassword()) return;

    this.isSaving.set(true);

    const request: CambiaPasswordRequestDTO = {
      vecchiaPassword: this.vecchiaPassword(),
      nuovaPassword: this.nuovaPassword(),
    };

    this.userService.changePassword(request)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isSaving.set(false))
      )
      .subscribe({
        next: () => {
          this.toastService.success('Password modificata con successo');
          this.resetPasswordForm();
        },
        error: (error) => {
          const message = error.error?.message || 'Errore durante il cambio password';
          this.toastService.error(message);
        }
      });
  }

  /**
   * Reset form password
   */
  private resetPasswordForm(): void {
    this.vecchiaPassword.set('');
    this.nuovaPassword.set('');
    this.confermaPassword.set('');
  }

  /**
   * Cambia tema
   */
  setTheme(theme: ThemeMode): void {
    this.currentTheme.set(theme);

    if (theme === 'system') {
      // Usa la preferenza di sistema
      this.themeStore.useSystemPreference();
    } else {
      // Imposta il tema specifico
      this.themeStore.setTheme(theme);
    }

    this.toastService.success('Tema applicato');
  }

  /**
   * Disattiva account
   */
  async deactivateAccount(): Promise<void> {
    if (!this.canDeactivate()) return;

    const confirmed = await this.dialogService.confirmDangerous({
      title: 'Disattiva account',
      message: 'Sei sicuro di voler disattivare il tuo account? Non potrai più accedere alla piattaforma fino a quando non contatterai l\'assistenza.',
      confirmText: 'Disattiva',
      cancelText: 'Annulla',
    });

    if (!confirmed) return;

    this.isSaving.set(true);

    const request: DisattivaAccountRequestDTO = {
      password: this.deactivatePassword(),
    };

    this.userService.deactivateAccount(request)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isSaving.set(false))
      )
      .subscribe({
        next: () => {
          this.toastService.success('Account disattivato');
          this.authService.logout();
          this.router.navigate(['/auth/login']);
        },
        error: (error) => {
          const message = error.error?.message || 'Errore durante la disattivazione';
          this.toastService.error(message);
        }
      });
  }

  /**
   * Toggle visibilità password
   */
  togglePasswordVisibility(field: 'old' | 'new' | 'confirm' | 'deactivate'): void {
    switch (field) {
      case 'old':
        this.showOldPassword.update(v => !v);
        break;
      case 'new':
        this.showNewPassword.update(v => !v);
        break;
      case 'confirm':
        this.showConfirmPassword.update(v => !v);
        break;
      case 'deactivate':
        this.showDeactivatePassword.update(v => !v);
        break;
    }
  }

  /**
   * Torna indietro
   */
  goBack(): void {
    this.location.back();
  }
}

