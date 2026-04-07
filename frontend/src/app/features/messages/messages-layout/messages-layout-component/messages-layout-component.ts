import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { ConversationsComponent } from '../../conversations/conversations-component/conversations-component';
import { GroupList } from '../../group-list/group-list';
import { GroupStore } from '../../../../core/stores/group-store';

@Component({
  selector: 'app-messages-layout-component',
  imports: [CommonModule, RouterOutlet, ConversationsComponent, GroupList],
  templateUrl: './messages-layout-component.html',
  styleUrl: './messages-layout-component.scss',
})
export class MessagesLayoutComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  readonly groupStore = inject(GroupStore);
  private routerSub?: Subscription;

  readonly hasChatOpen = signal(false);
  readonly activeTab = signal<'chat' | 'gruppi'>('chat');

  ngOnInit(): void {
    this.checkChatOpen();
    this.routerSub = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => this.checkChatOpen());
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  switchTab(tab: 'chat' | 'gruppi'): void {
    this.activeTab.set(tab);
    const url = this.router.url;
    // Se si cambia tab mentre una chat è aperta, torna alla lista messaggi
    const isDmOpen = /\/messages\/\d+/.test(url) && !url.includes('/messages/group/');
    const isGroupOpen = url.includes('/messages/group/');
    if ((tab === 'gruppi' && isDmOpen) || (tab === 'chat' && isGroupOpen)) {
      this.router.navigate(['/messages']);
    }
  }

  private checkChatOpen(): void {
    const url = this.router.url;
    // Rileva sia /messages/:userId che /messages/group/:groupId
    const match = /\/messages\/(\d+)/.exec(url) || /\/messages\/group\/(\d+)/.exec(url);
    this.hasChatOpen.set(!!match);

    // Auto-switch tab in base alla route
    if (url.includes('/messages/group/')) {
      this.activeTab.set('gruppi');
    }
  }
}
