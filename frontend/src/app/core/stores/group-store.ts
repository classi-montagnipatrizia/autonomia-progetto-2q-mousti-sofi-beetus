import { computed, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { GroupService } from '../api/group-service';
import { WebsocketService } from '../services/websocket-service';
import { LoggerService } from '../services/logger.service';
import {
  GroupResponseDTO,
  GroupSummaryDTO,
  GroupMessageDTO,
  CreaGruppoRequestDTO,
  ModificaGruppoRequestDTO,
  InviaMessaggioGruppoRequestDTO,
} from '../../models';

@Injectable({
  providedIn: 'root',
})
export class GroupStore {
  private readonly groupService = inject(GroupService);
  private readonly websocketService = inject(WebsocketService);
  private readonly logger = inject(LoggerService);

  // ============================================================================
  // SIGNALS PRIVATI
  // ============================================================================

  private readonly _myGroups = signal<GroupSummaryDTO[]>([]);
  private readonly _currentGroup = signal<GroupResponseDTO | null>(null);
  private readonly _messages = signal<GroupMessageDTO[]>([]);
  private readonly _isLoading = signal(false);
  private readonly _hasMoreMessages = signal(true);
  private readonly _currentPage = signal(0);

  // ============================================================================
  // SIGNALS PUBBLICI READONLY
  // ============================================================================

  readonly myGroups = this._myGroups.asReadonly();
  readonly currentGroup = this._currentGroup.asReadonly();
  readonly messages = this._messages.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly hasMoreMessages = this._hasMoreMessages.asReadonly();

  // ============================================================================
  // COMPUTED
  // ============================================================================

  readonly totalUnread = computed(() =>
    this._myGroups().reduce((sum, g) => sum + (g.unreadCount ?? 0), 0)
  );

  // ============================================================================
  // COSTRUTTORE — WebSocket
  // ============================================================================

  constructor() {
    // Ascolta i messaggi in arrivo dai gruppi (subscribeToGroup attivato all'apertura chat)
    this.websocketService.groupMessages$
      .pipe(takeUntilDestroyed())
      .subscribe((msg: GroupMessageDTO) => {
        this.handleIncomingMessage(msg);
      });
  }

  // ============================================================================
  // LISTA GRUPPI
  // ============================================================================

  async loadMyGroups(): Promise<void> {
    this._isLoading.set(true);
    try {
      const list = await firstValueFrom(this.groupService.getMieiGruppi());
      if (list) this._myGroups.set(list);
    } catch (error) {
      this.logger.error('Errore caricamento gruppi', error);
    } finally {
      this._isLoading.set(false);
    }
  }

  // ============================================================================
  // APERTURA / CHIUSURA CHAT
  // ============================================================================

  async openGroup(groupId: number): Promise<void> {
    this._isLoading.set(true);
    this._messages.set([]);
    this._currentPage.set(0);
    this._hasMoreMessages.set(true);

    // Unsubscribe dal gruppo precedente se diverso
    const prev = this._currentGroup();
    if (prev && prev.id !== groupId) {
      this.websocketService.unsubscribeFromGroup(prev.id);
    }

    try {
      const [group] = await Promise.all([
        firstValueFrom(this.groupService.getDettaglio(groupId)),
        this.loadMessages(groupId, 0),
        firstValueFrom(this.groupService.segnaLetto(groupId)),
      ]);

      if (group) this._currentGroup.set(group);

      // Azzera unread nella lista
      this._myGroups.update(list =>
        list.map(g => (g.id === groupId ? { ...g, unreadCount: 0 } : g))
      );

      // Subscribe WebSocket per ricevere nuovi messaggi in real-time
      this.websocketService.subscribeToGroup(groupId);
    } catch (error) {
      this.logger.error('Errore apertura gruppo', error);
    } finally {
      this._isLoading.set(false);
    }
  }

  closeGroup(): void {
    const current = this._currentGroup();
    if (current) {
      this.websocketService.unsubscribeFromGroup(current.id);
    }
    this._currentGroup.set(null);
    this._messages.set([]);
  }

  // ============================================================================
  // MESSAGGI
  // ============================================================================

  private async loadMessages(groupId: number, page: number): Promise<void> {
    const response = await firstValueFrom(this.groupService.getMessaggi(groupId, page));
    if (!response) return;

    // I messaggi arrivano DESC dal backend: invertiamo per mostrare i più vecchi in cima
    const sorted = [...response.content].reverse();

    if (page === 0) {
      this._messages.set(sorted);
    } else {
      // Infinite scroll verso l'alto: prepende i messaggi più vecchi
      this._messages.update(curr => [...sorted, ...curr]);
    }

    this._hasMoreMessages.set(!response.last);
    this._currentPage.set(page);
  }

  async loadMoreMessages(): Promise<void> {
    const group = this._currentGroup();
    if (!group || !this._hasMoreMessages() || this._isLoading()) return;
    await this.loadMessages(group.id, this._currentPage() + 1);
  }

  async inviaMessaggio(request: InviaMessaggioGruppoRequestDTO): Promise<void> {
    const group = this._currentGroup();
    if (!group) return;

    try {
      // Il messaggio arriverà anche via WebSocket ma lo aggiungiamo subito per UX ottimistica
      const msg = await firstValueFrom(this.groupService.inviaMessaggio(group.id, request));
      if (msg) {
        // Deduplicazione: il messaggio potrebbe essere già arrivato via WebSocket
        const exists = this._messages().some(m => m.id === msg.id);
        if (!exists) {
          this._messages.update(msgs => [...msgs, msg]);
        }
        this.updateLastMessage(group.id, msg);
      }
    } catch (error) {
      this.logger.error('Errore invio messaggio gruppo', error);
      throw error;
    }
  }

  // ============================================================================
  // ELIMINAZIONE MESSAGGI
  // ============================================================================

  async eliminaMessaggio(messageId: number): Promise<void> {
    const group = this._currentGroup();
    if (!group) return;

    // Aggiornamento ottimistico locale
    this._messages.update(msgs =>
      msgs.map(m => m.id === messageId
        ? { ...m, isDeletedBySender: true, content: null, imageUrl: null, audioUrl: null, audioDuration: null }
        : m
      )
    );

    try {
      await firstValueFrom(this.groupService.eliminaMessaggio(group.id, messageId));
    } catch (error) {
      this.logger.error('Errore eliminazione messaggio gruppo', error);
      // Rollback: ricarica messaggi
      await this.loadMessages(group.id, 0);
      throw error;
    }
  }

  // ============================================================================
  // CRUD GRUPPO
  // ============================================================================

  async creaGruppo(request: CreaGruppoRequestDTO): Promise<GroupResponseDTO> {
    const group = await firstValueFrom(this.groupService.creaGruppo(request));
    if (group) await this.loadMyGroups();
    return group;
  }

  async modificaGruppo(groupId: number, request: ModificaGruppoRequestDTO): Promise<void> {
    try {
      const updated = await firstValueFrom(this.groupService.modificaGruppo(groupId, request));
      if (updated) {
        this._currentGroup.set(updated);
        this._myGroups.update(list =>
          list.map(g =>
            g.id === groupId
              ? { ...g, name: updated.name, description: updated.description, profilePictureUrl: updated.profilePictureUrl }
              : g
          )
        );
      }
    } catch (error) {
      this.logger.error('Errore modifica gruppo', error);
      throw error;
    }
  }

  async eliminaGruppo(groupId: number): Promise<void> {
    try {
      await firstValueFrom(this.groupService.eliminaGruppo(groupId));
      this.websocketService.unsubscribeFromGroup(groupId);
      this._myGroups.update(list => list.filter(g => g.id !== groupId));
      this._currentGroup.set(null);
      this._messages.set([]);
    } catch (error) {
      this.logger.error('Errore eliminazione gruppo', error);
      throw error;
    }
  }

  async abbandonaGruppo(groupId: number): Promise<void> {
    try {
      await firstValueFrom(this.groupService.abbandonaGruppo(groupId));
      this.websocketService.unsubscribeFromGroup(groupId);
      this._myGroups.update(list => list.filter(g => g.id !== groupId));
      this._currentGroup.set(null);
      this._messages.set([]);
    } catch (error) {
      this.logger.error('Errore abbandono gruppo', error);
      throw error;
    }
  }

  async aggiungiMembro(groupId: number, userId: number): Promise<void> {
    try {
      const updated = await firstValueFrom(this.groupService.aggiungiMembro(groupId, userId));
      if (updated) this._currentGroup.set(updated);
    } catch (error) {
      this.logger.error('Errore aggiunta membro', error);
      throw error;
    }
  }

  async rimuoviMembro(groupId: number, userId: number): Promise<void> {
    try {
      const updated = await firstValueFrom(this.groupService.rimuoviMembro(groupId, userId));
      if (updated) this._currentGroup.set(updated);
    } catch (error) {
      this.logger.error('Errore rimozione membro', error);
      throw error;
    }
  }

  // ============================================================================
  // WEBSOCKET — messaggi in arrivo
  // ============================================================================

  private handleIncomingMessage(msg: GroupMessageDTO): void {
    const current = this._currentGroup();

    if (current && msg.groupId === current.id) {
      // Se il messaggio esiste già ed è stato eliminato, aggiorna lo stato
      const existingIndex = this._messages().findIndex(m => m.id === msg.id);
      if (existingIndex !== -1) {
        if (msg.isDeletedBySender) {
          this._messages.update(msgs =>
            msgs.map(m => m.id === msg.id ? msg : m)
          );
        }
        // Già presente e non eliminato → ignora (deduplicazione)
      } else {
        this._messages.update(msgs => [...msgs, msg]);
      }
    } else {
      // Chat chiusa: incrementa badge unread nella lista
      this._myGroups.update(list =>
        list.map(g =>
          g.id === msg.groupId ? { ...g, unreadCount: (g.unreadCount ?? 0) + 1 } : g
        )
      );
    }

    this.updateLastMessage(msg.groupId, msg);
  }

  private updateLastMessage(groupId: number, msg: GroupMessageDTO): void {
    this._myGroups.update(list =>
      list.map(g =>
        g.id === groupId
          ? {
              ...g,
              lastMessageContent: msg.content ?? (msg.audioUrl ? '🎤 Messaggio vocale' : msg.imageUrl ? '📷 Foto' : null),
              lastMessageAt: msg.createdAt,
            }
          : g
      )
    );
  }

  // ============================================================================
  // UTILITY
  // ============================================================================

  clear(): void {
    const current = this._currentGroup();
    if (current) this.websocketService.unsubscribeFromGroup(current.id);
    this._myGroups.set([]);
    this._currentGroup.set(null);
    this._messages.set([]);
    this._isLoading.set(false);
    this._hasMoreMessages.set(true);
    this._currentPage.set(0);
  }
}
