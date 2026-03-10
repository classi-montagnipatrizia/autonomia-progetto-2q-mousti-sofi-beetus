import { Component, computed, ElementRef, inject, OnDestroy, OnInit, signal, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  LucideAngularModule,
  X,
  Lightbulb,
  Send,
  RefreshCw,
  Search,
  AlertTriangle,
} from 'lucide-angular';

import { AiChatbotStore } from '../../../core/stores/ai-chatbot-store';
import { AuthStore } from '../../../core/stores/auth-store';
import { AvatarComponent } from '../../../shared/ui/avatar/avatar-component/avatar-component';
import { SpinnerComponent } from '../../../shared/ui/spinner/spinner-component/spinner-component';
import { AiChatMessageDTO, AiSuggestedBookDTO, BookCondition } from '../../../models';

@Component({
  selector: 'app-ai-chatbot',
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    AvatarComponent,
    SpinnerComponent,
  ],
  templateUrl: './ai-chatbot.html',
  styleUrl: './ai-chatbot.scss',
})
export class AiChatbot implements OnInit, OnDestroy, AfterViewChecked {
  private readonly router = inject(Router);
  readonly store = inject(AiChatbotStore);
  readonly authStore = inject(AuthStore);

  @ViewChild('messagesContainer') messagesContainer!: ElementRef<HTMLDivElement>;

  // Icons
  readonly XIcon = X;
  readonly LightbulbIcon = Lightbulb;
  readonly SendIcon = Send;
  readonly RefreshCwIcon = RefreshCw;
  readonly SearchIcon = Search;
  readonly AlertTriangleIcon = AlertTriangle;

  // Enums
  readonly BookCondition = BookCondition;

  // Local state
  readonly inputMessage = signal('');
  private shouldScrollToBottom = false;

  // Quick suggestions
  readonly quickSuggestions = [
    'Libri di italiano',
    'Sotto 10€',
    'Per il 5° anno',
    'Come nuovi',
  ];

  // Computed
  readonly currentUserName = computed(() => this.authStore.currentUser()?.nomeCompleto ?? 'Utente');
  readonly currentUserAvatar = computed(() => this.authStore.currentUser()?.profilePictureUrl ?? null);
  readonly canSend = computed(() => this.inputMessage().trim().length > 0 && !this.store.sending());

  ngOnInit(): void {
    this.store.initialize();
    this.shouldScrollToBottom = true;
  }

  ngOnDestroy(): void {
    // Non puliamo lo store per mantenere la cronologia se l'utente torna
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  onClose(): void {
    this.router.navigate(['/library']);
  }

  async onSend(): Promise<void> {
    const msg = this.inputMessage().trim();
    if (!msg || this.store.sending()) return;

    this.inputMessage.set('');
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

  onSuggestionClick(suggestion: string): void {
    this.inputMessage.set(suggestion);
    this.onSend();
  }

  onBookClick(book: AiSuggestedBookDTO): void {
    this.router.navigate(['/library', book.listingId]);
  }

  async onRetry(): Promise<void> {
    this.shouldScrollToBottom = true;
    await this.store.retryLastMessage();
    this.shouldScrollToBottom = true;
  }

  conditionLabel(condizione: BookCondition): string {
    switch (condizione) {
      case BookCondition.COME_NUOVO: return 'Come nuovo';
      case BookCondition.BUONE_CONDIZIONI: return 'Buone cond.';
      case BookCondition.USATO: return 'Usato';
      default: return '';
    }
  }

  conditionColorClass(condizione: BookCondition): string {
    switch (condizione) {
      case BookCondition.COME_NUOVO: return 'text-success-600 dark:text-success-400 bg-success-50 dark:bg-success-900/30';
      case BookCondition.BUONE_CONDIZIONI: return 'text-warning-600 dark:text-warning-400 bg-warning-50 dark:bg-warning-900/30';
      case BookCondition.USATO: return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700';
      default: return '';
    }
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
