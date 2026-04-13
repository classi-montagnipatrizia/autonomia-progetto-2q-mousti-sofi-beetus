import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AvatarComponent, AvatarSize } from '../../../ui/avatar/avatar-component/avatar-component';

/**
 * Varianti di visualizzazione dell'item utente
 */
export type UserListItemVariant = 'default' | 'compact' | 'detailed';

@Component({
  selector: 'app-user-list-item-component',
  imports: [CommonModule, AvatarComponent],
  templateUrl: './user-list-item-component.html',
  styleUrl: './user-list-item-component.scss',
})
export class UserListItemComponent {
 /**
   * ID dell'utente
   */
  readonly userId = input.required<number>();

  /**
   * Username dell'utente
   */
  readonly username = input.required<string>();

  /**
   * Nome completo dell'utente
   */
  readonly nomeCompleto = input.required<string>();

  /**
   * URL immagine profilo
   */
  readonly profilePictureUrl = input<string | null>(null);

  /**
   * Stato online dell'utente
   * @default false
   */
  readonly isOnline = input<boolean>(false);

  /**
   * Variante di visualizzazione
   * @default 'default'
   */
  readonly variant = input<UserListItemVariant>('default');

  /**
   * Abilita navigazione al profilo al click
   * @default true
   */
  readonly clickable = input<boolean>(true);

  /**
   * Disabilita la navigazione automatica al profilo (usa solo l'output userClick)
   * @default false
   */
  readonly preventNavigation = input<boolean>(false);

  /**
   * Mostra lo status online/offline
   * @default true
   */
  readonly showStatus = input<boolean>(true);

  /**
   * Testo secondario opzionale (bio, ruolo, ecc.)
   */
  readonly subtitle = input<string>('');

  /**
   * Emesso quando l'utente viene cliccato
   */
  readonly userClick = output<number>();

  constructor(private readonly router: Router) {}

  /**
   * Dimensione avatar in base alla variante
   */
  readonly avatarSize = computed((): AvatarSize => {
    const variantSizeMap: Record<UserListItemVariant, AvatarSize> = {
      compact: 'sm',
      default: 'md',
      detailed: 'lg',
    };
    return variantSizeMap[this.variant()];
  });

  /**
   * Classi CSS per il contenitore principale
   */
  readonly containerClasses = computed(() => {
    const base = 'flex items-center gap-3.5 rounded-[20px] transition-all duration-300';
    const clickableClasses = this.clickable()
      ? 'cursor-pointer hover:bg-white/80 dark:hover:bg-gray-800/60 hover:backdrop-blur-md active:scale-[0.98] border border-transparent hover:border-white/50 dark:hover:border-gray-700/50 hover:shadow-sm'
      : '';

    const paddingMap: Record<UserListItemVariant, string> = {
      compact: 'p-2',
      default: 'p-3',
      detailed: 'p-4',
    };

    return `${base} ${clickableClasses} ${paddingMap[this.variant()]}`;
  });

  /**
   * Classi CSS per il nome utente
   */
  readonly nameClasses = computed(() => {
    const sizeMap: Record<UserListItemVariant, string> = {
      compact: 'text-[14px]',
      default: 'text-[15px]',
      detailed: 'text-[17px]',
    };
    return `font-bold text-gray-900 dark:text-white transition-colors group-hover:text-primary-600 dark:group-hover:text-primary-400 ${sizeMap[this.variant()]}`;
  });

  /**
   * Classi CSS per l'username
   */
  readonly usernameClasses = computed(() => {
    const sizeMap: Record<UserListItemVariant, string> = {
      compact: 'text-[12px]',
      default: 'text-[13px]',
      detailed: 'text-[14px]',
    };
    return `font-medium text-gray-500 dark:text-gray-400 ${sizeMap[this.variant()]}`;
  });

  /**
   * Gestisce il click sull'item
   */
  onClick(): void {
    if (!this.clickable()) return;

    this.userClick.emit(this.userId());
    
    // Naviga al profilo solo se la navigazione automatica non è disabilitata
    if (!this.preventNavigation()) {
      this.router.navigate(['/profile', this.userId()]);
    }
  }

  /**
   * Status da passare all'avatar
   */
  readonly avatarStatus = computed(() => {
    if (!this.showStatus()) return 'none' as const;
    return this.isOnline() ? 'online' as const : 'offline' as const;
  });
}
