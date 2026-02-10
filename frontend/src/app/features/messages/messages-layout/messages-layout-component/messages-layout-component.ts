import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { ConversationsComponent } from '../../conversations/conversations-component/conversations-component';

/**
 * Layout principale per la sezione messaggi.
 * 
 * Desktop (lg+): Layout a 2 colonne
 * - Sinistra: Lista conversazioni (sempre visibile)
 * - Destra: Chat attiva o placeholder
 * 
 * Mobile (< lg): 
 * - Mostra solo lista conversazioni O chat (non entrambi)
 * - La navigazione avviene tramite route
 */
@Component({
  selector: 'app-messages-layout-component',
  imports: [ CommonModule,
      RouterOutlet,
      ConversationsComponent,],
  templateUrl: './messages-layout-component.html',
  styleUrl: './messages-layout-component.scss',
})
export class MessagesLayoutComponent implements OnInit, OnDestroy {
private readonly router = inject(Router);
  private routerSub?: Subscription;

  // Signal per tracciare se c'è una chat aperta
  readonly hasChatOpen = signal(false);

  ngOnInit(): void {
    // Controlla lo stato iniziale
    this.checkChatOpen();

    // Sottoscrivi ai cambiamenti di navigazione
    this.routerSub = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => this.checkChatOpen());
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  private checkChatOpen(): void {
    // Controlla se siamo su /messages/:userId
    const url = this.router.url;
    const match = url.match(/\/messages\/(\d+)/);
    this.hasChatOpen.set(!!match);
  }
}
