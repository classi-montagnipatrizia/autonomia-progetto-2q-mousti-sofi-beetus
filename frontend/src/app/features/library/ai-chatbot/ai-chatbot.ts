import { Component, computed, ElementRef, inject, OnInit, output, signal, viewChild, AfterViewChecked } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  LucideAngularModule,
  X,
  Lightbulb,
  Send,
  RefreshCw,
  Search,
  TriangleAlert,
} from 'lucide-angular';

import { AiChatbotStore } from '../../../core/stores/ai-chatbot-store';
import { AuthStore } from '../../../core/stores/auth-store';
import { AvatarComponent } from '../../../shared/ui/avatar/avatar-component/avatar-component';
import { SpinnerComponent } from '../../../shared/ui/spinner/spinner-component/spinner-component';
import { BookCondition, BookSummaryDTO } from '../../../models';

@Component({
  selector: 'app-ai-chatbot',
  imports: [
    FormsModule,
    LucideAngularModule,
    AvatarComponent,
    SpinnerComponent
],
  templateUrl: './ai-chatbot.html',
  styleUrl: './ai-chatbot.scss',
})
export class AiChatbot implements OnInit, AfterViewChecked {
  private readonly router = inject(Router);
  readonly store = inject(AiChatbotStore);
  readonly authStore = inject(AuthStore);

  private readonly messagesContainer = viewChild<ElementRef<HTMLDivElement>>('messagesContainer');

  // Icons
  readonly closed = output<void>();

  readonly XIcon = X;
  readonly LightbulbIcon = Lightbulb;
  readonly SendIcon = Send;
  readonly RefreshCwIcon = RefreshCw;
  readonly SearchIcon = Search;
  readonly AlertTriangleIcon = TriangleAlert;

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

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  onClose(): void {
    this.closed.emit();
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

  onBookClick(book: BookSummaryDTO): void {
    this.router.navigate(['/library', book.id]);
  }

  async onRetry(): Promise<void> {
    this.shouldScrollToBottom = true;
    await this.store.retryLastMessage();
    this.shouldScrollToBottom = true;
  }

  conditionLabel(condizione: BookCondition): string {
    switch (condizione) {
      case BookCondition.OTTIMO: return 'Ottimo';
      case BookCondition.BUONO: return 'Buono';
      case BookCondition.ACCETTABILE: return 'Accettabile';
      default: return '';
    }
  }

  conditionColorClass(condizione: BookCondition): string {
    switch (condizione) {
      case BookCondition.OTTIMO: return 'text-success-600 dark:text-success-400 bg-success-50 dark:bg-success-900/30';
      case BookCondition.BUONO: return 'text-warning-600 dark:text-warning-400 bg-warning-50 dark:bg-warning-900/30';
      case BookCondition.ACCETTABILE: return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700';
      default: return '';
    }
  }

  private scrollToBottom(): void {
    try {
      const container = this.messagesContainer();
      if (container) {
        const el = container.nativeElement;
        el.scrollTop = el.scrollHeight;
      }
    } catch { /* scroll non critico */ }
  }
}
