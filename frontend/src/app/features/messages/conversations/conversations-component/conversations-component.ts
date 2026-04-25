import { Component, DestroyRef, inject, OnInit, OnDestroy, signal, computed, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, ArrowLeft, MessageSquare, Search, X } from 'lucide-angular';
import { interval, Subject } from 'rxjs';
import { switchMap, debounceTime, distinctUntilChanged, filter } from 'rxjs/operators';
import { MessageService } from '../../../../core/api/message-service';
import { OnlineUsersStore } from '../../../../core/stores/online-users-store';
import { TypingStore } from '../../../../core/stores/typing-store';
import { AuthStore } from '../../../../core/stores/auth-store';
import { GroupStore } from '../../../../core/stores/group-store';
import { ConversationResponseDTO, MessageResponseDTO } from '../../../../models';
import { ConversationItemComponent } from '../../../../shared/components/conversation-item/conversation-item-component/conversation-item-component';
import { SkeletonComponent } from '../../../../shared/ui/skeleton/skeleton-component/skeleton-component';
import { AvatarComponent } from '../../../../shared/ui/avatar/avatar-component/avatar-component';
import { TimeAgoPipe } from '../../../../shared/pipes/time-ago.pipe';
import { POLLING_INTERVALS, TIMEOUTS, LIMITS } from '../../../../core/config/app.config';
import { HighlightSegment, splitHighlight } from '../../../../core/utils/highlight.utils';

/**
 * Lista delle conversazioni dell'utente.
 * Su mobile: schermo intero con freccia per tornare alla home.
 * Su desktop: colonna sinistra del layout messaggi.
 * 
 * La ricerca funziona in stile WhatsApp:
 * - Mostra risultati da TUTTI i messaggi, non solo dalle conversazioni
 * - Cliccando su un risultato si va alla chat e si evidenzia il messaggio
 */
@Component({
  selector: 'app-conversations-component',
  standalone: true,
  imports: [
    FormsModule,
    LucideAngularModule,
    ConversationItemComponent,
    SkeletonComponent,
    AvatarComponent,
    TimeAgoPipe
],
  templateUrl: './conversations-component.html',
  styleUrl: './conversations-component.scss',
})
export class ConversationsComponent implements OnInit, OnDestroy {
  private readonly messageService = inject(MessageService);
  private readonly onlineUsersStore = inject(OnlineUsersStore);
  private readonly typingStore = inject(TypingStore);
  private readonly authStore = inject(AuthStore);
  readonly groupStore = inject(GroupStore);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly searchSubject = new Subject<string>();

  // Output per switch tab
  readonly tabChanged = output<'chat' | 'gruppi'>();

  // Icone
  readonly ArrowLeftIcon = ArrowLeft;
  readonly MessageSquareIcon = MessageSquare;
  readonly SearchIcon = Search;
  readonly XIcon = X;

  // Stato
  readonly conversations = signal<ConversationResponseDTO[]>([]);
  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);
  readonly selectedUserId = signal<number | null>(null);
  readonly searchQuery = signal('');
  
  // Stato ricerca messaggi
  readonly searchResults = signal<MessageResponseDTO[]>([]);
  readonly isSearching = signal(false);
  readonly isSearchMode = computed(() => this.searchQuery().trim().length > 0);

  // Usa costanti centralizzate da app.config.ts
  private readonly POLLING_INTERVAL = POLLING_INTERVALS.CONVERSATIONS;

  // Computed - filtra per ricerca (solo conversazioni, non messaggi)
  readonly filteredConversations = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const convs = this.conversations();
    
    if (!query) return convs;
    
    // In modalità ricerca, filtra solo per nome utente (i messaggi sono separati)
    return convs.filter(conv => 
      conv.altroUtente.username.toLowerCase().includes(query) ||
      conv.altroUtente.nomeCompleto?.toLowerCase().includes(query)
    );
  });

  readonly hasConversations = computed(() => this.filteredConversations().length > 0);
  readonly hasSearchResults = computed(() => this.searchResults().length > 0);
  readonly isEmpty = computed(() => !this.isLoading() && !this.isSearchMode() && this.conversations().length === 0);
  readonly noSearchResults = computed(() => 
    !this.isLoading() && 
    !this.isSearching() &&
    this.isSearchMode() && 
    !this.hasConversations() && 
    !this.hasSearchResults()
  );

  ngOnInit(): void {
    this.loadConversations();
    this.startPolling();
    this.setupSearchDebounce();
    this.onlineUsersStore.loadOnlineUsers();
  }

  ngOnDestroy(): void {
    this.searchSubject.complete();
  }

  /**
   * Setup del debounce per la ricerca messaggi
   */
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

  /**
   * Esegue la ricerca messaggi
   */
  private performSearch(query: string): void {
    this.isSearching.set(true);
    this.messageService.searchMessages(query).subscribe({
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

  /**
   * Carica le conversazioni immediatamente al primo accesso.
   */
  private loadConversations(): void {
    this.messageService.getConversations(0, 50).subscribe({
      next: (response) => {
        this.conversations.set(response.content);
        this.isLoading.set(false);
      },
      error: () => {
        this.error.set('Impossibile caricare le conversazioni');
        this.isLoading.set(false);
      },
    });
  }

  /**
   * Polling periodico come backup al WebSocket (30s).
   */
  private startPolling(): void {
    interval(this.POLLING_INTERVAL)
      .pipe(
        switchMap(() => this.messageService.getConversations(0, 50)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response) => {
          this.conversations.set(response.content);
          this.isLoading.set(false);
        },
        error: () => { /* polling errors non critici */ },
      });
  }

  /**
   * Verifica se un utente è online usando lo store
   */
  isUserOnline(userId: number): boolean {
    return this.onlineUsersStore.isUserOnline(userId);
  }

  /**
   * Verifica se un utente sta scrivendo
   */
  isUserTyping(username: string): boolean {
    return this.typingStore.isUserTypingByUsername(username);
  }

  onConversationSelect(userId: number): void {
    this.selectedUserId.set(userId);
    this.router.navigate(['/messages', userId]);
  }

  /**
   * Naviga a un messaggio specifico dalla ricerca
   */
  onSearchResultClick(message: MessageResponseDTO): void {
    // Determina l'altro utente (mittente o destinatario)
    const currentUserId = this.authStore.userId();
    const otherId = message.mittente.id === currentUserId
      ? message.destinatario.id
      : message.mittente.id;
    this.selectedUserId.set(otherId);
    // Naviga alla chat con l'ID del messaggio e la query di ricerca
    this.router.navigate(['/messages', otherId], {
      queryParams: {
        messageId: message.id,
        highlight: this.searchQuery()
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/']);
  }

  refresh(): void {
    this.isLoading.set(true);
    this.messageService.getConversations(0, 50).subscribe({
      next: (response) => {
        this.conversations.set(response.content);
        this.isLoading.set(false);
      },
      error: () => {
        this.error.set('Impossibile caricare le conversazioni');
        this.isLoading.set(false);
      },
    });
  }

  onSearchChange(value: string): void {
    this.searchQuery.set(value);
    
    if (value.trim().length >= 2) {
      this.searchSubject.next(value);
    } else {
      this.searchResults.set([]);
    }
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.searchResults.set([]);
  }

  highlightSegments(text: string | null | undefined, searchTerm: string): readonly HighlightSegment[] {
    return splitHighlight(text ?? '', searchTerm);
  }

  /**
   * Ottiene il messaggio di anteprima per una conversazione.
   * Gestisce i casi di messaggio eliminato o nascosto.
   */
  getLastMessagePreview(conversation: ConversationResponseDTO): string {
    const lastMsg = conversation.ultimoMessaggio;
    const currentUserId = this.authStore.userId();

    if (lastMsg.isDeletedBySender) {
      // Se sono io il mittente, mostro "Hai cancellato", altrimenti "Messaggio cancellato"
      return lastMsg.mittente.id === currentUserId
        ? 'Hai cancellato questo messaggio'
        : 'Messaggio cancellato';
    }

    if (lastMsg.isHiddenByCurrentUser) {
      return 'Hai nascosto questo messaggio';
    }

    // Messaggio vocale
    if (lastMsg.audioUrl) {
      return '🎤 Messaggio vocale';
    }

    // Se c'è solo un'immagine senza testo
    if (!lastMsg.contenuto && lastMsg.imageUrl) {
      return '📷 Immagine';
    }

    return lastMsg.contenuto || '';
  }
}
