import { Component, computed, inject, OnInit, output, signal } from '@angular/core';

import { Router } from '@angular/router';
import { LucideAngularModule, ArrowLeft, Plus, Users } from 'lucide-angular';
import { GroupStore } from '../../../core/stores/group-store';
import { AuthStore } from '../../../core/stores/auth-store';
import { GroupSummaryDTO, CreaGruppoRequestDTO } from '../../../models';
import { CreateGroupModal } from '../create-group-modal/create-group-modal';
import { TimeAgoPipe } from '../../../shared/pipes/time-ago.pipe';

const AVATAR_COLORS = [
  { from: 'from-blue-500', to: 'to-blue-600' },
  { from: 'from-green-500', to: 'to-green-600' },
  { from: 'from-purple-500', to: 'to-purple-600' },
  { from: 'from-orange-500', to: 'to-orange-600' },
  { from: 'from-pink-500', to: 'to-pink-600' },
  { from: 'from-cyan-500', to: 'to-cyan-600' },
];

@Component({
  selector: 'app-group-list',
  imports: [LucideAngularModule, CreateGroupModal, TimeAgoPipe],
  templateUrl: './group-list.html',
  styleUrl: './group-list.scss',
})
export class GroupList implements OnInit {
  readonly groupStore = inject(GroupStore);
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);

  readonly tabChanged = output<'chat' | 'gruppi'>();

  readonly ArrowLeftIcon = ArrowLeft;
  readonly PlusIcon = Plus;
  readonly UsersIcon = Users;

  readonly showCreateModal = signal(false);
  readonly selectedGroupId = signal<number | null>(null);

  readonly isEmpty = computed(() =>
    !this.groupStore.isLoading() && this.groupStore.myGroups().length === 0
  );

  ngOnInit(): void {
    this.groupStore.loadMyGroups();
  }

  getInitials(name: string): string {
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  getAvatarColor(groupId: number): { from: string; to: string } {
    return AVATAR_COLORS[groupId % AVATAR_COLORS.length];
  }

  openGroup(group: GroupSummaryDTO): void {
    this.selectedGroupId.set(group.id);
    this.router.navigate(['/messages', 'group', group.id]);
  }

  openCreateModal(): void {
    this.showCreateModal.set(true);
  }

  async onGroupCreated(event: { request: CreaGruppoRequestDTO; memberIds: number[] }): Promise<void> {
    try {
      const group = await this.groupStore.creaGruppo(event.request);
      await Promise.all(
        event.memberIds.map(userId => this.groupStore.aggiungiMembro(group.id, userId))
      );
      this.showCreateModal.set(false);
      this.router.navigate(['/messages', 'group', group.id]);
    } catch {
      // Errore gestito dal toast nel store
    }
  }

  goBack(): void {
    this.router.navigate(['/']);
  }
}
