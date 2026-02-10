import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { InputComponent } from '../../../../shared/ui/input/input-component/input-component';
import { ButtonComponent } from '../../../../shared/ui/button/button-component/button-component';
import { AuthService } from '../../../../core/auth/services/auth-service';
import { ToastService } from '../../../../core/services/toast-service';
import { schoolEmailValidator, usernameValidator } from '../../../../core/utils/validators';

@Component({
  selector: 'app-login-component',
  imports: [ CommonModule,
    ReactiveFormsModule,
    RouterLink,
    InputComponent,
    ButtonComponent,],
  templateUrl: './login-component.html',
  styleUrl: './login-component.scss',
})
export class LoginComponent implements OnInit {
private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);

  // Stato UI
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string>('');
  readonly showResendForm = signal<boolean>(false);
  readonly isResending = signal<boolean>(false);
  readonly verificationInfoMessage = signal<string>('');

  // Form per reinvio verifica
  readonly resendForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, schoolEmailValidator()]],
  });

  // Form di login
  readonly loginForm: FormGroup = this.fb.group({
    username: ['', [Validators.required, usernameValidator()]],
    password: ['', [Validators.required, Validators.minLength(1)]], // Solo verifica che non sia vuota
  });

  ngOnInit(): void {
    // Controlla se proveniente da registrazione con verifica pendente
    const state = history.state;

    if (state?.emailVerificationPending) {
      const email = state.email;
      this.verificationInfoMessage.set(
        email
          ? `Abbiamo inviato un'email di verifica a ${email}. Controlla la tua casella di posta e clicca sul link per attivare il tuo account.`
          : 'Ti abbiamo inviato un\'email di verifica. Controlla la tua casella di posta.'
      );
      if (email) {
        this.resendForm.patchValue({ email });
      }
    }
  }

  /**
   * Ottiene il messaggio di errore per un campo
   */
  getFieldError(fieldName: string): string {
    const control = this.loginForm.get(fieldName);

    if (!control?.errors || !control.touched) {
      return '';
    }

    // Errore required
    if (control.errors['required']) {
      return `${this.getFieldLabel(fieldName)} è obbligatorio`;
    }

    // Errore custom dal validatore username
    if (control.errors['username']) {
      return control.errors['username'].message;
    }

    return '';
  }

  /**
   * Restituisce la label del campo
   */
  private getFieldLabel(fieldName: string): string {
    const labels: Record<string, string> = {
      username: 'Username',
      password: 'Password',
    };
    return labels[fieldName] || fieldName;
  }

  /**
   * Gestisce il submit del form
   */
  onSubmit(): void {
    // Marca tutti i campi come touched per mostrare errori
    this.loginForm.markAllAsTouched();

    if (this.loginForm.invalid) {
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    const { username, password } = this.loginForm.value;

    this.authService.login({ username, password }).subscribe({
      next: () => {
        this.toastService.success('Accesso effettuato con successo!');
        this.router.navigate(['/']);
      },
      error: (error) => {
        this.isLoading.set(false);

        // Gestione errori specifici
        if (error.status === 401) {
          this.errorMessage.set('Credenziali non valide. Riprova.');
        } else if (error.status === 403 || error.error?.message?.includes('verificare')) {
          // Utente non ha verificato l'email
          this.errorMessage.set('Devi verificare la tua email prima di accedere.');
          this.showResendForm.set(true);
        } else if (error.status === 0) {
          this.errorMessage.set('Impossibile connettersi al server. Verifica la connessione.');
        } else {
          this.errorMessage.set(error.error?.message || 'Errore durante il login. Riprova.');
        }
      },
    });
  }

  toggleResendForm(): void {
    this.showResendForm.set(!this.showResendForm());
  }

  resendVerificationEmail(): void {
    if (this.resendForm.invalid) {
      this.resendForm.markAllAsTouched();
      return;
    }

    this.isResending.set(true);
    const email = this.resendForm.value.email;

    this.authService.resendVerificationEmail(email).subscribe({
      next: (response) => {
        this.isResending.set(false);
        this.toastService.success(
          response.message || 'Email di verifica inviata! Controlla la tua casella di posta.'
        );
        this.showResendForm.set(false);
      },
      error: (error) => {
        this.isResending.set(false);

        if (error.status === 429) {
          this.toastService.error(
            'Hai superato il limite di 3 richieste per ora. Riprova più tardi.'
          );
        } else {
          this.toastService.error(
            error.error?.message || 'Errore durante l\'invio. Riprova.'
          );
        }
      },
    });
  }

  getResendFieldError(fieldName: string): string {
    const control = this.resendForm.get(fieldName);

    if (!control?.errors || !control.touched) {
      return '';
    }

    if (control.errors['required']) {
      return 'Email è obbligatoria';
    }

    if (control.errors['email']) {
      return control.errors['email'].message || 'Inserisci un indirizzo email valido';
    }

    if (control.errors['schoolEmail']) {
      return control.errors['schoolEmail'].message;
    }

    return '';
  }
}
