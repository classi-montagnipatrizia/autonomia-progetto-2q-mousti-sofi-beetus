import { Component, inject, signal, computed, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  LucideAngularModule,
  ArrowLeft,
  Search,
  Users,
  Shield,
  ShieldOff,
  UserX,
  UserCheck,
  Trash2,
  EllipsisVertical,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  LoaderCircle,
} from 'lucide-angular';
import { Subject, takeUntil, finalize, debounceTime, distinctUntilChanged } from 'rxjs';

import { AdminService, AdminUserDTO } from '../../../../core/api/admin-service';
import { ToastService } from '../../../../core/services/toast-service';
import { DialogService } from '../../../../core/services/dialog-service';
import { ButtonComponent } from '../../../../shared/ui/button/button-component/button-component';
import { AvatarComponent } from '../../../../shared/ui/avatar/avatar-component/avatar-component';
import { AuthService } from '../../../../core/auth/services/auth-service';

@Component({
  selector: 'app-users-component',
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    LucideAngularModule,
    ButtonComponent,
    AvatarComponent,
  ],
  templateUrl: './users-component.html',
  styleUrl: './users-component.scss',
})
export class UsersComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly adminService = inject(AdminService);
  private readonly toastService = inject(ToastService);
  private readonly dialogService = inject(DialogService);
  private readonly authService = inject(AuthService);
  private readonly destroy$ = new Subject<void>();
  private readonly searchSubject$ = new Subject<string>();
  private readonly currentUsername = this.authService.getCurrentUser()?.username;

  // Icone
  readonly ArrowLeftIcon = ArrowLeft;
  readonly SearchIcon = Search;
  readonly UsersIcon = Users;
  readonly ShieldIcon = Shield;
  readonly ShieldOffIcon = ShieldOff;
  readonly UserXIcon = UserX;
  readonly UserCheckIcon = UserCheck;
  readonly Trash2Icon = Trash2;
  readonly MoreVerticalIcon = EllipsisVertical;
  readonly ChevronLeftIcon = ChevronLeft;
  readonly ChevronRightIcon = ChevronRight;
  readonly AlertCircleIcon = CircleAlert;
  readonly LoaderIcon = LoaderCircle;

  // State
  readonly isLoading = signal(true);
  readonly hasError = signal(false);
  readonly users = signal<AdminUserDTO[]>([]);
  readonly searchQuery = signal('');
  readonly activeDropdown = signal<number | null>(null);
  readonly processingUser = signal<number | null>(null);

  // Paginazione
  readonly currentPage = signal(0);
  readonly totalPages = signal(0);
  readonly totalElements = signal(0);
  readonly pageSize = 20;

  // Computed
  readonly hasUsers = computed(() => this.users().length > 0);
  readonly isFirstPage = computed(() => this.currentPage() === 0);
  readonly isLastPage = computed(() => this.currentPage() >= this.totalPages() - 1);

  ngOnInit(): void {
    this.setupSearch();
    this.loadUsers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Chiude il dropdown quando si clicca fuori
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    this.closeDropdown();
  }

  /**
   * Configura debounce sulla ricerca
   */
  private setupSearch(): void {
    this.searchSubject$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe((query) => {
        this.currentPage.set(0);
        if (query.trim()) {
          this.searchUsers(query);
        } else {
          this.loadUsers();
        }
      });
  }

  /**
   * Carica lista utenti (escluso l'admin corrente)
   */
  loadUsers(): void {
    this.isLoading.set(true);
    this.hasError.set(false);

    this.adminService.getAllUsers(this.currentPage(), this.pageSize)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: (response) => {
          // Filtra l'admin corrente dalla lista
          const filteredUsers = response.content.filter(
            user => user.username !== this.currentUsername
          );
          this.users.set(filteredUsers);
          this.totalPages.set(response.totalPages);
          this.totalElements.set(response.totalElements - (response.content.length - filteredUsers.length));
        },
        error: () => {
          this.hasError.set(true);
          this.toastService.error('Errore nel caricamento degli utenti');
        }
      });
  }

  /**
   * Cerca utenti (escluso l'admin corrente)
   */
  searchUsers(query: string): void {
    this.isLoading.set(true);
    this.hasError.set(false);

    this.adminService.getAllUsers(this.currentPage(), this.pageSize, query)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: (response) => {
          // Filtra l'admin corrente dalla lista
          const filteredUsers = response.content.filter(
            user => user.username !== this.currentUsername
          );
          this.users.set(filteredUsers);
          this.totalPages.set(response.totalPages);
          this.totalElements.set(response.totalElements - (response.content.length - filteredUsers.length));
        },
        error: () => {
          this.hasError.set(true);
          this.toastService.error('Errore nella ricerca');
        }
      });
  }

  /**
   * Handler ricerca
   */
  onSearch(event: Event): void {
    const query = (event.target as HTMLInputElement).value;
    this.searchQuery.set(query);
    this.searchSubject$.next(query);
  }

  /**
   * Toggle dropdown azioni
   */
  toggleDropdown(userId: number): void {
    if (this.activeDropdown() === userId) {
      this.activeDropdown.set(null);
    } else {
      this.activeDropdown.set(userId);
    }
  }

  /**
   * Chiude dropdown se click esterno
   */
  closeDropdown(): void {
    this.activeDropdown.set(null);
  }

  /**
   * Promuove utente ad admin
   */
  async promoteUser(user: AdminUserDTO): Promise<void> {
    const confirmed = await this.dialogService.confirm({
      title: 'Promuovi ad amministratore',
      message: `Sei sicuro di voler promuovere "${user.username}" ad amministratore? L'utente avrà accesso completo al pannello di amministrazione.`,
      confirmText: 'Promuovi',
      cancelText: 'Annulla',
    });

    if (!confirmed) {
      this.closeDropdown();
      return;
    }

    this.closeDropdown();
    this.processingUser.set(user.id);

    this.adminService.promoteToAdmin(user.id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.processingUser.set(null))
      )
      .subscribe({
        next: () => {
          this.toastService.success(`${user.username} è ora amministratore`);
          // Aggiorna stato locale
          this.users.update(users =>
            users.map(u => u.id === user.id ? { ...u, isAdmin: true } : u)
          );
        },
        error: () => {
          this.toastService.error('Errore durante la promozione');
        }
      });
  }

  /**
   * Rimuove privilegi admin
   */
  async demoteUser(user: AdminUserDTO): Promise<void> {
    const confirmed = await this.dialogService.confirm({
      title: 'Rimuovi privilegi admin',
      message: `Sei sicuro di voler rimuovere i privilegi di amministratore da "${user.username}"?`,
      confirmText: 'Rimuovi',
      cancelText: 'Annulla',
    });

    if (!confirmed) {
      this.closeDropdown();
      return;
    }

    this.closeDropdown();
    this.processingUser.set(user.id);

    this.adminService.demoteFromAdmin(user.id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.processingUser.set(null))
      )
      .subscribe({
        next: () => {
          this.toastService.success(`Privilegi admin rimossi da ${user.username}`);
          this.users.update(users =>
            users.map(u => u.id === user.id ? { ...u, isAdmin: false } : u)
          );
        },
        error: () => {
          this.toastService.error('Errore durante la rimozione privilegi');
        }
      });
  }

  /**
   * Disattiva account utente
   */
  async disableUser(user: AdminUserDTO): Promise<void> {
    const confirmed = await this.dialogService.confirmDangerous({
      title: 'Disattiva account',
      message: `Sei sicuro di voler disattivare l'account di "${user.username}"? L'utente non potrà più accedere alla piattaforma.`,
      confirmText: 'Disattiva',
      cancelText: 'Annulla',
    });

    if (!confirmed) {
      this.closeDropdown();
      return;
    }

    this.closeDropdown();
    this.processingUser.set(user.id);

    this.adminService.disableUser(user.id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.processingUser.set(null))
      )
      .subscribe({
        next: () => {
          this.toastService.success(`Account ${user.username} disattivato`);
          this.users.update(users =>
            users.map(u => u.id === user.id ? { ...u, isActive: false } : u)
          );
        },
        error: () => {
          this.toastService.error('Errore durante la disattivazione');
        }
      });
  }

  /**
   * Riattiva account utente
   */
  async enableUser(user: AdminUserDTO): Promise<void> {
    this.closeDropdown();
    this.processingUser.set(user.id);

    this.adminService.enableUser(user.id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.processingUser.set(null))
      )
      .subscribe({
        next: () => {
          this.toastService.success(`Account ${user.username} riattivato`);
          this.users.update(users =>
            users.map(u => u.id === user.id ? { ...u, isActive: true } : u)
          );
        },
        error: () => {
          this.toastService.error('Errore durante la riattivazione');
        }
      });
  }

  /**
   * Elimina definitivamente utente
   */
  async deleteUser(user: AdminUserDTO): Promise<void> {
    // Controllo preventivo: se l'utente è admin, mostra errore
    if (user.isAdmin) {
      this.closeDropdown();
      this.toastService.error('Non è possibile eliminare un account amministratore. Rimuovi prima i privilegi admin.');
      return;
    }

    const confirmed = await this.dialogService.confirmDangerous({
      title: 'Elimina utente',
      message: `Sei sicuro di voler eliminare DEFINITIVAMENTE l'account di "${user.username}"? Questa azione non può essere annullata e tutti i dati dell'utente verranno rimossi.`,
      confirmText: 'Elimina definitivamente',
      cancelText: 'Annulla',
    });

    if (!confirmed) {
      this.closeDropdown();
      return;
    }

    this.closeDropdown();
    this.processingUser.set(user.id);

    this.adminService.deleteUser(user.id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.processingUser.set(null))
      )
      .subscribe({
        next: () => {
          this.toastService.success(`Utente ${user.username} eliminato`);
          this.users.update(users => users.filter(u => u.id !== user.id));
          this.totalElements.update(n => n - 1);
        },
        error: (err) => {
          // Gestione errore specifico per admin
          const errorMessage = err?.error?.message || err?.message || '';
          if (errorMessage.toLowerCase().includes('admin')) {
            this.toastService.error('Non è possibile eliminare un account amministratore');
          } else {
            this.toastService.error('Errore durante l\'eliminazione');
          }
        }
      });
  }

  /**
   * Navigazione pagine
   */
  goToPage(page: number): void {
    if (page < 0 || page >= this.totalPages()) return;
    this.currentPage.set(page);

    const query = this.searchQuery();
    if (query.trim()) {
      this.searchUsers(query);
    } else {
      this.loadUsers();
    }
  }

  previousPage(): void {
    this.goToPage(this.currentPage() - 1);
  }

  nextPage(): void {
    this.goToPage(this.currentPage() + 1);
  }

  /**
   * Torna indietro
   */
  goBack(): void {
    this.router.navigate(['/admin']);
  }
}
