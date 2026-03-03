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
} from 'lucide-angular';

import { LibraryStore } from '../../../core/stores/library-store';
import { AuthStore } from '../../../core/stores/auth-store';
import { AvatarComponent } from '../../../shared/ui/avatar/avatar-component/avatar-component';
import { SkeletonComponent } from '../../../shared/ui/skeleton/skeleton-component/skeleton-component';
import { LibraryMessageResponseDTO } from '../../../models';

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

  @ViewChild('messagesContainer') messagesContainer!: ElementRef<HTMLDivElement>;

  // Icons
  readonly ArrowLeftIcon = ArrowLeft;
  readonly SendIcon = Send;
  readonly BookOpenIcon = BookOpen;
  readonly ExternalLinkIcon = ExternalLink;
  readonly MessageCircleIcon = MessageCircle;

  // Local state
  readonly chatInput = signal('');
  private shouldScrollToBottom = false;

  // Computed
  readonly conversation = this.store.activeConversation;
  readonly messages = this.store.chatMessages;
  readonly loading = this.store.chatLoading;
  readonly currentUserId = computed(() => this.authStore.userId() ?? 0);

  readonly otherUserName = computed(() => this.conversation()?.altroUtente.nomeCompleto ?? '');
  readonly otherUserAvatar = computed(() => this.conversation()?.altroUtente.profilePictureUrl ?? null);
  readonly otherUserOnline = computed(() => this.conversation()?.altroUtente.isOnline ?? false);
  readonly bookTitle = computed(() => this.conversation()?.annuncio.titolo ?? '');
  readonly bookImage = computed(() => this.conversation()?.annuncio.imageUrl ?? '');
  readonly bookPrice = computed(() => this.conversation()?.annuncio.prezzo ?? 0);
  readonly bookId = computed(() => this.conversation()?.annuncio.id ?? 0);
  readonly roleLabel = computed(() => {
    const conv = this.conversation();
    if (!conv) return '';
    return conv.ruolo === 'VENDITORE' ? 'Stai vendendo' : 'Vuoi comprare';
  });

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('conversationId'));
    if (id) {
      this.store.openConversationById(id);
      this.shouldScrollToBottom = true;
    }
  }

  ngOnDestroy(): void {
    this.store.closeConversation();
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

  isMyMessage(message: LibraryMessageResponseDTO): boolean {
    const userId = this.currentUserId();
    // In mock, userId potrebbe essere 0 se non autenticato. Fallback: messaggio pari = mio
    if (userId > 0) {
      return message.mittente.id === userId;
    }
    return message.id % 2 === 0;
  }

  async onSend(): Promise<void> {
    const msg = this.chatInput().trim();
    if (!msg) return;

    this.chatInput.set('');
    this.shouldScrollToBottom = true;
    await this.store.sendMessage(msg);
    this.shouldScrollToBottom = true;
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.onSend();
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
