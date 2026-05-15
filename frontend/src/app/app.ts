import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { SwUpdate } from '@angular/service-worker';
import { DialogComponent } from './shared/ui/dialog/dialog-component/dialog-component';
import { ToastComponent } from './shared/ui/toast/toast-component/toast-component';
import { ThemeStore } from './core/stores/theme-store';
import { AuthService } from './core/auth/services/auth-service';
import { ToastService } from './core/services/toast-service';

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
  private readonly authService = inject(AuthService);
  private readonly swUpdate = inject(SwUpdate);
  private readonly toastService = inject(ToastService);

  async ngOnInit(): Promise<void> {
    await this.authService.initAuth();
    this.checkForUpdates();
  }

  private checkForUpdates(): void {
    if (!this.swUpdate.isEnabled) return;

    this.swUpdate.versionUpdates.pipe(
      filter(e => e.type === 'VERSION_READY')
    ).subscribe(() => {
      this.toastService.info('Nuova versione disponibile — aggiornamento in corso...', {
        duration: 0,
        dismissible: false,
      });
      this.swUpdate.activateUpdate().then(() => window.location.reload());
    });
  }

}
