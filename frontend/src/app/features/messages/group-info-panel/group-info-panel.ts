import { Component, computed, inject, OnInit, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, X, Pencil, UserPlus, UserMinus, Trash2, LogOut, Search } from 'lucide-angular';
import { GroupStore } from '../../../core/stores/group-store';
import { AuthStore } from '../../../core/stores/auth-store';
import { OnlineUsersStore } from '../../../core/stores/online-users-store';
import { DialogService } from '../../../core/services/dialog-service';
import { ToastService } from '../../../core/services/toast-service';
import { UserService } from '../../../core/api/user-service';
import { GroupMemberDTO, UserSummaryDTO, ModificaGruppoRequestDTO } from '../../../models';
import { AvatarComponent } from '../../../shared/ui/avatar/avatar-component/avatar-component';

const AVATAR_COLORS = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-cyan-500'];

@Component({
  selector: 'app-group-info-panel',
  imports: [CommonModule, FormsModule, LucideAngularModule, AvatarComponent],
  templateUrl: './group-info-panel.html',
  styleUrl: './group-info-panel.scss',
})
export class GroupInfoPanel implements OnInit {
  readonly groupStore = inject(GroupStore);
  readonly authStore = inject(AuthStore);
  readonly onlineUsersStore = inject(OnlineUsersStore);
  private readonly dialogService = inject(DialogService);
  private readonly toastService = inject(ToastService);
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);

  readonly closed = output<void>();

  readonly XIcon = X;
  readonly PencilIcon = Pencil;
  readonly UserPlusIcon = UserPlus;
  readonly UserMinusIcon = UserMinus;
  readonly Trash2Icon = Trash2;
  readonly LogOutIcon = LogOut;
  readonly SearchIcon = Search;

  // Stato editing
  readonly isEditing = signal(false);
  readonly editName = signal('');
  readonly editDescription = signal('');

  // Stato aggiunta membro
  readonly showAddMember = signal(false);
  readonly searchQuery = signal('');
  readonly searchResults = signal<UserSummaryDTO[]>([]);
  readonly isSearching = signal(false);

  // Membri visibili (mostra tutti o solo i primi 5)
  readonly showAllMembers = signal(false);

  readonly group = computed(() => this.groupStore.currentGroup());
  readonly isAdmin = computed(() => this.group()?.isAdmin ?? false);

  readonly currentUserId = computed(() => this.authStore.userId());

  readonly sortedMembers = computed(() => {
    const group = this.group();
    if (!group) return [];
    const myId = this.currentUserId();
    // "Tu" in cima
    return [...group.members].sort((a, b) => {
      if (a.id === myId) return -1;
      if (b.id === myId) return 1;
      return 0;
    });
  });

  readonly visibleMembers = computed(() => {
    const all = this.sortedMembers();
    return this.showAllMembers() ? all : all.slice(0, 5);
  });

  readonly hasMoreMembers = computed(() => this.sortedMembers().length > 5);
  readonly remainingCount = computed(() => Math.max(0, this.sortedMembers().length - 5));

  ngOnInit(): void {
    this.groupStore.loadMyGroups();
  }

  getMemberColor(memberId: number): string {
    return AVATAR_COLORS[memberId % AVATAR_COLORS.length];
  }

  getMemberInitials(fullName: string): string {
    const words = fullName.trim().split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return fullName.substring(0, 2).toUpperCase();
  }

  getGroupInitials(name: string): string {
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  getGroupAvatarGradient(groupId: number): string {
    const gradients = [
      'from-blue-500 to-blue-600',
      'from-green-500 to-green-600',
      'from-purple-500 to-purple-600',
      'from-orange-500 to-orange-600',
      'from-pink-500 to-pink-600',
      'from-cyan-500 to-cyan-600',
    ];
    return gradients[groupId % gradients.length];
  }

  isUserOnline(userId: number): boolean {
    return this.onlineUsersStore.isUserOnline(userId);
  }

  // ── Edit ──
  startEditing(): void {
    const g = this.group();
    if (!g) return;
    this.editName.set(g.name);
    this.editDescription.set(g.description ?? '');
    this.isEditing.set(true);
  }

  cancelEditing(): void {
    this.isEditing.set(false);
  }

  async saveEditing(): Promise<void> {
    const g = this.group();
    if (!g) return;
    const request: ModificaGruppoRequestDTO = {
      nome: this.editName().trim(),
      descrizione: this.editDescription().trim() || undefined,
    };
    try {
      await this.groupStore.modificaGruppo(g.id, request);
      this.isEditing.set(false);
      this.toastService.success('Gruppo modificato');
    } catch {
      this.toastService.error('Errore nella modifica');
    }
  }

  // ── Aggiungi membro ──
  toggleAddMember(): void {
    this.showAddMember.update(v => !v);
    this.searchQuery.set('');
    this.searchResults.set([]);
  }

  onSearchInput(query: string): void {
    this.searchQuery.set(query);
    if (query.trim().length < 2) {
      this.searchResults.set([]);
      return;
    }
    this.isSearching.set(true);
    this.userService.searchUsers(query, 0, 20, 'username', true).subscribe({
      next: (response) => {
        // Escludi membri già presenti
        const memberIds = new Set(this.group()?.members.map(m => m.id) ?? []);
        this.searchResults.set(response.content.filter(u => !memberIds.has(u.id)));
        this.isSearching.set(false);
      },
      error: () => {
        this.searchResults.set([]);
        this.isSearching.set(false);
      },
    });
  }

  async addMember(user: UserSummaryDTO): Promise<void> {
    const g = this.group();
    if (!g) return;
    try {
      await this.groupStore.aggiungiMembro(g.id, user.id);
      this.searchResults.update(list => list.filter(u => u.id !== user.id));
      this.toastService.success(`${user.nomeCompleto} aggiunto al gruppo`);
    } catch {
      this.toastService.error('Errore nell\'aggiunta');
    }
  }

  // ── Rimuovi membro ──
  async removeMember(member: GroupMemberDTO): Promise<void> {
    const g = this.group();
    if (!g) return;

    const confirmed = await this.dialogService.confirmDangerous({
      title: 'Rimuovere dal gruppo?',
      message: `${member.fullName} verrà rimosso dal gruppo.`,
      confirmText: 'Rimuovi',
    });

    if (confirmed) {
      try {
        await this.groupStore.rimuoviMembro(g.id, member.id);
        this.toastService.success(`${member.fullName} rimosso`);
      } catch {
        this.toastService.error('Errore nella rimozione');
      }
    }
  }

  // ── Elimina gruppo ──
  async deleteGroup(): Promise<void> {
    const g = this.group();
    if (!g) return;

    const confirmed = await this.dialogService.confirmDangerous({
      title: 'Eliminare il gruppo?',
      message: `Tutti i messaggi e i dati di "${g.name}" verranno eliminati definitivamente.`,
      confirmText: 'Elimina',
    });

    if (confirmed) {
      try {
        await this.groupStore.eliminaGruppo(g.id);
        this.toastService.success('Gruppo eliminato');
        this.closed.emit();
        this.router.navigate(['/messages']);
      } catch {
        this.toastService.error('Errore nell\'eliminazione');
      }
    }
  }

  // ── Abbandona gruppo ──
  async leaveGroup(): Promise<void> {
    const g = this.group();
    if (!g) return;

    const confirmed = await this.dialogService.confirmDangerous({
      title: 'Abbandonare il gruppo?',
      message: `Non potrai più accedere ai messaggi di "${g.name}".`,
      confirmText: 'Abbandona',
    });

    if (confirmed) {
      try {
        await this.groupStore.abbandonaGruppo(g.id);
        this.toastService.success('Hai abbandonato il gruppo');
        this.closed.emit();
        this.router.navigate(['/messages']);
      } catch {
        this.toastService.error('Errore nell\'abbandono');
      }
    }
  }
}
