import { Component, input, output, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  LucideAngularModule,
  Heart,
  MessageCircle,
  AtSign,
  Mail,
  FileText,
  LucideIconData,
} from 'lucide-angular';
import { AvatarComponent } from '../../../ui/avatar/avatar-component/avatar-component';
import { TimeAgoComponent } from '../../time-ago/time-ago-component/time-ago-component';
import { DebounceClick } from '../../../directives/debounce-click';
import { NotificationType } from '../../../../models';

@Component({
  selector: 'app-notification-item-component',
  imports: [CommonModule, LucideAngularModule, AvatarComponent, TimeAgoComponent, DebounceClick],
  templateUrl: './notification-item-component.html',
  styleUrl: './notification-item-component.scss',
})
export class NotificationItemComponent {
 private readonly router = inject(Router);

  // Icone Lucide
  readonly HeartIcon = Heart;
  readonly MessageCircleIcon = MessageCircle;
  readonly AtSignIcon = AtSign;
  readonly MailIcon = Mail;
  readonly FileTextIcon = FileText;

  /**
   * ID della notifica
   */
  readonly notificationId = input.required<number>();

  /**
   * Tipo di notifica
   */
  readonly tipo = input.required<NotificationType>();

  /**
   * Contenuto della notifica
   */
  readonly contenuto = input.required<string>();

  /**
   * URL di navigazione al contenuto correlato
   */
  readonly actionUrl = input.required<string>();

  /**
   * Stato di lettura della notifica
   */
  readonly isRead = input.required<boolean>();

  /**
   * Data di creazione (formato ISO 8601)
   */
  readonly createdAt = input.required<string>();

  /**
   * Username dell'utente che ha generato la notifica
   */
  readonly triggerUsername = input.required<string>();

  /**
   * Nome completo dell'utente che ha generato la notifica
   */
  readonly triggerNomeCompleto = input.required<string>();

  /**
   * URL immagine profilo dell'utente trigger
   */
  readonly triggerProfilePictureUrl = input<string | null>(null);

  /**
   * Emesso quando la notifica viene cliccata
   */
  readonly notificationClick = output<number>();

  /**
   * Emesso quando si richiede di marcare come letta
   */
  readonly markAsRead = output<number>();

  /**
   * Emesso quando si richiede l'eliminazione
   */
  readonly deleteRequest = output<number>();

  /**
   * Icona in base al tipo di notifica
   */
  readonly icon = computed((): LucideIconData => {
    const iconMap: Record<NotificationType, LucideIconData> = {
      [NotificationType.LIKE]: this.HeartIcon,
      [NotificationType.COMMENT]: this.MessageCircleIcon,
      [NotificationType.MENTION]: this.AtSignIcon,
      [NotificationType.DIRECT_MESSAGE]: this.MailIcon,
      [NotificationType.NEW_POST]: this.FileTextIcon,
    };
    return iconMap[this.tipo()];
  });

  /**
   * Colore icona in base al tipo
   */
  readonly iconColorClasses = computed(() => {
    const colorMap: Record<NotificationType, string> = {
      [NotificationType.LIKE]: 'text-error-500',
      [NotificationType.COMMENT]: 'text-primary-500',
      [NotificationType.MENTION]: 'text-info-500',
      [NotificationType.DIRECT_MESSAGE]: 'text-success-500',
      [NotificationType.NEW_POST]: 'text-warning-500',
    };
    return colorMap[this.tipo()];
  });

  /**
   * Classi CSS per il contenitore principale
   */
  readonly containerClasses = computed(() => {
    const base =
      'flex items-start gap-3 p-4 rounded-lg cursor-pointer transition-colors';
    const readState = this.isRead()
      ? 'bg-transparent hover:bg-gray-50 dark:hover:bg-gray-800'
      : 'bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/30';

    return `${base} ${readState}`;
  });

  /**
   * Gestisce il click sulla notifica
   */
  onClick(): void {
    // Emette evento per marcare come letta se non lo è già
    if (!this.isRead()) {
      this.markAsRead.emit(this.notificationId());
    }

    this.notificationClick.emit(this.notificationId());

    // Naviga all'URL di destinazione
    if (this.actionUrl()) {
      this.router.navigateByUrl(this.actionUrl());
    }
  }

  /**
   * Gestisce l'eliminazione (stoppa la propagazione)
   */
  onDelete(event: Event): void {
    event.stopPropagation();
    this.deleteRequest.emit(this.notificationId());
  }
}
