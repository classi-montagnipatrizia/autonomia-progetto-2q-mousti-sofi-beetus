import { Component, input, output, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AvatarComponent } from '../../../ui/avatar/avatar-component/avatar-component';
import { BadgeComponent } from '../../../ui/badge/badge-component/badge-component';
import { TimeAgoComponent } from '../../time-ago/time-ago-component/time-ago-component';
@Component({
  selector: 'app-conversation-item-component',
  imports: [CommonModule, AvatarComponent, BadgeComponent, TimeAgoComponent],
  templateUrl: './conversation-item-component.html',
  styleUrl: './conversation-item-component.scss',
})
export class ConversationItemComponent {
  private readonly router = inject(Router);

  /**
   * ID dell'altro utente nella conversazione
   */
  readonly userId = input.required<number>();

  /**
   * Username dell'altro utente
   */
  readonly username = input.required<string>();

  /**
   * Nome completo dell'altro utente
   */
  readonly nomeCompleto = input.required<string>();

  /**
   * URL immagine profilo dell'altro utente
   */
  readonly profilePictureUrl = input<string | null>(null);

  /**
   * Stato online dell'altro utente
   */
  readonly isOnline = input<boolean>(false);

  /**
   * Indica se l'altro utente sta scrivendo
   */
  readonly isTyping = input<boolean>(false);

  /**
   * Anteprima dell'ultimo messaggio
   */
  readonly lastMessage = input<string>('');

  /**
   * Timestamp dell'ultima attività (formato ISO 8601)
   */
  readonly lastActivityAt = input.required<string>();

  /**
   * Numero di messaggi non letti
   * @default 0
   */
  readonly unreadCount = input<number>(0);

  /**
   * Indica se la conversazione è attualmente selezionata
   * @default false
   */
  readonly isSelected = input<boolean>(false);

  /**
   * Emesso quando la conversazione viene selezionata
   */
  readonly conversationSelect = output<number>();

  /**
   * Classi CSS per il contenitore principale
   */
  readonly containerClasses = computed(() => {
    const base = 'flex items-center gap-3 p-3.5 sm:p-4 rounded-[20px] transition-all duration-300 border border-transparent cursor-pointer group active:scale-[0.98]';

    if (this.isSelected()) {
      return `${base} bg-primary-50 dark:bg-primary-900/30 border-primary-200 dark:border-primary-500/30 shadow-sm`;
    }

    if (this.unreadCount() > 0) {
      return `${base} bg-white/70 dark:bg-gray-800/60 backdrop-blur-md border-white/50 dark:border-gray-700/50 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:bg-white/90 dark:hover:bg-gray-800/80`;
    }

    return `${base} bg-transparent hover:bg-white/50 dark:hover:bg-gray-800/30 hover:backdrop-blur-sm`;
  });

  /**
   * Classi CSS per il nome
   */
  readonly nameClasses = computed(() => {
    const base = 'font-bold text-[15px] leading-tight text-gray-900 dark:text-white truncate transition-colors group-hover:text-primary-600 dark:group-hover:text-primary-400';

    return this.unreadCount() > 0 ? `${base} font-black text-primary-900 dark:text-primary-50` : base;
  });

  /**
   * Classi CSS per l'anteprima messaggio
   */
  readonly messageClasses = computed(() => {
    const base = 'text-[13px] truncate transition-colors';

    if (this.unreadCount() > 0) {
      return `${base} text-gray-900 dark:text-gray-100 font-semibold`;
    }

    return `${base} text-gray-500 dark:text-gray-400 font-medium group-hover:text-gray-600 dark:group-hover:text-gray-300`;
  });

  /**
   * Anteprima messaggio troncata
   */
  readonly truncatedMessage = computed(() => {
    const message = this.lastMessage();
    if (!message) return 'Nessun messaggio';

    // Tronca a 50 caratteri
    if (message.length > 50) {
      return message.slice(0, 50) + '...';
    }

    return message;
  });

  /**
   * Status per l'avatar
   */
  readonly avatarStatus = computed(() => {
    return this.isOnline() ? ('online' as const) : ('offline' as const);
  });

  /**
   * Testo badge non letti (max 99+)
   */
  readonly unreadBadgeText = computed(() => {
    const count = this.unreadCount();
    return count > 99 ? '99+' : count.toString();
  });

  /**
   * Gestisce la selezione della conversazione
   */
  onSelect(): void {
    this.conversationSelect.emit(this.userId());
  }
}
