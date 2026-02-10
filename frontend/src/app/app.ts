import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DialogComponent } from './shared/ui/dialog/dialog-component/dialog-component';
import { ToastComponent } from './shared/ui/toast/toast-component/toast-component';
import { ThemeStore } from './core/stores/theme-store';
import { AuthService } from './core/auth/services/auth-service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, DialogComponent, ToastComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  // Inizializza il ThemeStore all'avvio per applicare il tema salvato in localStorage
  // Questo garantisce che il tema sia applicato anche sulle pagine pubbliche (login, register, ecc.)
  private readonly themeStore = inject(ThemeStore);

  // Inizializza l'AuthService per ripristinare la sessione da localStorage
  private readonly authService = inject(AuthService);

  async ngOnInit(): Promise<void> {
    // Ripristina la sessione utente dai token salvati in localStorage
    // Attende il completamento per gestire il refresh automatico del token
    await this.authService.initAuth();
  }

}
