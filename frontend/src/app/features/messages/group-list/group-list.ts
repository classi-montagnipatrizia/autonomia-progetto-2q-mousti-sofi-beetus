import { Component, computed, DestroyRef, inject, OnDestroy, OnInit, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, ArrowLeft, Plus, Users, Search, X } from 'lucide-angular';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter } from 'rxjs/operators';
import { GroupStore } from '../../../core/stores/group-store';
import { GroupService } from '../../../core/api/group-service';
import { GroupSummaryDTO, GroupMessageDTO, CreaGruppoRequestDTO } from '../../../models';
import { CreateGroupModal } from '../create-group-modal/create-group-modal';
import { TimeAgoPipe } from '../../../shared/pipes/time-ago.pipe';
import { AvatarComponent } from '../../../shared/ui/avatar/avatar-component/avatar-component';
import { TIMEOUTS, LIMITS } from '../../../core/config/app.config';
import { HighlightSegment, splitHighlight } from '../../../core/utils/highlight.utils';

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
  imports: [LucideAngularModule, FormsModule, CreateGroupModal, TimeAgoPipe, AvatarComponent],
  templateUrl: './group-list.html',
  styleUrl: './group-list.scss',
})
export class GroupList implements OnInit, OnDestroy {
  readonly groupStore = inject(GroupStore);
  private readonly groupService = inject(GroupService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly searchSubject = new Subject<string>();

  readonly tabChanged = output<'chat' | 'gruppi'>();

  readonly ArrowLeftIcon = ArrowLeft;
  readonly PlusIcon = Plus;
  readonly UsersIcon = Users;
  readonly SearchIcon = Search;
  readonly XIcon = X;

  readonly showCreateModal = signal(false);
  readonly selectedGroupId = signal<number | null>(null);
  readonly searchQuery = signal('');
  readonly searchResults = signal<GroupMessageDTO[]>([]);
  readonly isSearching = signal(false);

  readonly isSearchMode = computed(() => this.searchQuery().trim().length > 0);

  readonly filteredGroups = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const groups = this.groupStore.myGroups();
    if (!q) return groups;
    return groups.filter(g => g.name.toLowerCase().includes(q));
  });

  readonly isEmpty = computed(() =>
    !this.groupStore.isLoading() && !this.isSearchMode() && this.groupStore.myGroups().length === 0
  );

  readonly hasSearchResults = computed(() => this.searchResults().length > 0);

  readonly noSearchResults = computed(() =>
    !this.groupStore.isLoading() &&
    !this.isSearching() &&
    this.isSearchMode() &&
    !this.hasSearchResults() &&
    this.filteredGroups().length === 0
  );

  ngOnInit(): void {
    this.groupStore.loadMyGroups();
    this.setupSearchDebounce();
  }

  ngOnDestroy(): void {
    this.searchSubject.complete();
  }

  private setupSearchDebounce(): void {
    this.searchSubject.pipe(
      debounceTime(TIMEOUTS.SEARCH_DEBOUNCE),
      distinctUntilChanged(),
      filter(query => query.trim().length >= LIMITS.MIN_SEARCH_LENGTH),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(query => {
      this.performSearch(query);
    });
  }

  private performSearch(query: string): void {
    this.isSearching.set(true);
    this.groupService.searchMessagesGlobal(query).subscribe({
      next: (results) => {
        this.searchResults.set(results);
        this.isSearching.set(false);
      },
      error: () => {
        this.searchResults.set([]);
        this.isSearching.set(false);
      },
    });
  }

  onSearchChange(value: string): void {
    this.searchQuery.set(value);
    if (value.trim().length >= LIMITS.MIN_SEARCH_LENGTH) {
      this.searchSubject.next(value);
    } else {
      this.searchResults.set([]);
    }
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.searchResults.set([]);
  }

  onSearchResultClick(message: GroupMessageDTO): void {
    this.selectedGroupId.set(message.groupId);
    this.router.navigate(['/messages', 'group', message.groupId], {
      queryParams: { messageId: message.id, highlight: this.searchQuery() }
    });
  }

  getGroupNameById(groupId: number): string {
    return this.groupStore.myGroups().find(g => g.id === groupId)?.name ?? 'Gruppo';
  }

  highlightSegments(text: string | null | undefined, searchTerm: string): readonly HighlightSegment[] {
    return splitHighlight(text ?? '', searchTerm);
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
