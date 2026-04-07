import { Component, computed, ElementRef, inject, OnDestroy, OnInit, signal, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  LucideAngularModule,
  ArrowLeft,
  Send,
  BookOpen,
  ExternalLink,
  MessageCircle,
  Trash2,
} from 'lucide-angular';

import { LibraryStore } from '../../../core/stores/library-store';
import { AuthStore } from '../../../core/stores/auth-store';
import { WebsocketService } from '../../../core/services/websocket-service';
import { AvatarComponent } from '../../../shared/ui/avatar/avatar-component/avatar-component';
import { SkeletonComponent } from '../../../shared/ui/skeleton/skeleton-component/skeleton-component';
import { BookMessageDTO } from '../../../models';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-book-conversation',
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    AvatarComponent,
    SkeletonComponent,
  ],
  templateUrl: './book-conversation.html',
  styleUrl: './book-conversation.scss',
})
export class BookConversation implements OnInit, OnDestroy, AfterViewChecked {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly store = inject(LibraryStore);
  private readonly authStore = inject(AuthStore);
  private readonly websocketService = inject(WebsocketService);

  @ViewChild('messagesContainer') messagesContainer!: ElementRef<HTMLDivElement>;

  // Icons
  readonly ArrowLeftIcon = ArrowLeft;
  readonly SendIcon = Send;
  readonly BookOpenIcon = BookOpen;
  readonly ExternalLinkIcon = ExternalLink;
  readonly MessageCircleIcon = MessageCircle;
  readonly Trash2Icon = Trash2;

  // Local state
  readonly chatInput = signal('');
  readonly deletingIds = signal<Set<number>>(new Set());
  private shouldScrollToBottom = false;
  private bookIdFromRoute = 0;
  private wsSubscription?: Subscription;

  // Computed
  readonly conversation = this.store.currentConversation;
  readonly messages = this.store.currentConversationMessages;
  readonly loading = this.store.isLoading;
  readonly currentUserId = computed(() => this.authStore.userId() ?? 0);

  readonly otherUserName = computed(() => this.conversation()?.altroUtente.nomeCompleto ?? '');
  readonly otherUserAvatar = computed(() => this.conversation()?.altroUtente.profilePictureUrl ?? null);
  readonly otherUserOnline = computed(() => this.conversation()?.altroUtente.isOnline ?? false);
  readonly bookTitle = computed(() => this.conversation()?.libro.titolo ?? '');
  readonly bookImage = computed(() => this.conversation()?.libro.frontImageUrl ?? '');
  readonly bookPrice = computed(() => this.conversation()?.libro.prezzo ?? 0);
  readonly bookId = computed(() => this.conversation()?.libro.id ?? this.bookIdFromRoute);

  readonly isSeller = computed(() => {
    const conv = this.conversation();
    if (!conv) return false;
    return conv.libro.venditore.id === this.currentUserId();
  });

  readonly roleLabel = computed(() => {
    const conv = this.conversation();
    if (!conv) return '';
    return conv.libro.venditore.id === this.currentUserId() ? 'Stai vendendo' : 'Vuoi comprare';
  });

  ngOnInit(): void {
    const bookId = Number(this.route.snapshot.paramMap.get('bookId'));
    const convId = this.route.snapshot.queryParamMap.get('convId');
    if (bookId) {
      this.bookIdFromRoute = bookId;
      this.store.openConversazione(bookId, convId ? Number(convId) : undefined);
      this.shouldScrollToBottom = true;
    }

    // Sottoscrizione WebSocket per messaggi libro real-time
    this.wsSubscription = this.websocketService.bookMessages$.subscribe({
      next: (message: BookMessageDTO) => {
        this.store.handleIncomingBookMessage(message);
        if (message.conversationId === this.conversation()?.id) {
          this.shouldScrollToBottom = true;
        }
      },
    });
  }

  ngOnDestroy(): void {
    this.store.closeConversazione();
    this.wsSubscription?.unsubscribe();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  goBack(): void {
    this.store.setActiveTab('messaggi');
    this.router.navigate(['/library']);
  }

  goToBookDetail(): void {
    const id = this.bookId();
    if (id) {
      this.router.navigate(['/library', id]);
    }
  }

  goToProfile(): void {
    const conv = this.conversation();
    if (conv) {
      this.router.navigate(['/profile', conv.altroUtente.id]);
    }
  }

  isMyMessage(message: BookMessageDTO): boolean {
    return message.mittente.id === this.currentUserId();
  }

  async onSend(): Promise<void> {
    const msg = this.chatInput().trim();
    if (!msg) return;

    this.chatInput.set('');
    this.shouldScrollToBottom = true;
    await this.store.inviaMessaggio(this.bookId(), msg, this.conversation()?.id);
    this.shouldScrollToBottom = true;
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.onSend();
    }
  }

  async deleteMessage(messageId: number): Promise<void> {
    if (this.deletingIds().has(messageId)) return;

    this.deletingIds.update(set => new Set(set).add(messageId));
    try {
      await this.store.eliminaMessaggio(messageId);
    } finally {
      this.deletingIds.update(set => {
        const next = new Set(set);
        next.delete(messageId);
        return next;
      });
    }
  }

  formatTime(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  }

  private scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        const el = this.messagesContainer.nativeElement;
        el.scrollTop = el.scrollHeight;
      }
    } catch (_) { /* ignore */ }
  }
}
