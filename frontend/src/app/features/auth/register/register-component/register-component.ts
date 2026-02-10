import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { InputComponent } from '../../../../shared/ui/input/input-component/input-component';
import { ButtonComponent } from '../../../../shared/ui/button/button-component/button-component';
import { AuthService } from '../../../../core/auth/services/auth-service';
import { UserService } from '../../../../core/api/user-service';
import { ToastService } from '../../../../core/services/toast-service';
import { matchPasswordValidator, maxLengthValidator, passwordValidator, schoolEmailValidator, usernameValidator } from '../../../../core/utils/validators';

import { debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';

@Component({
  selector: 'app-register-component',
  imports: [CommonModule,
    ReactiveFormsModule,
    RouterLink,
    InputComponent,
    ButtonComponent,],
  templateUrl: './register-component.html',
  styleUrl: './register-component.scss',
})
export class RegisterComponent {
 private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);

  // Stato UI
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string>('');
  readonly usernameAvailable = signal<boolean | null>(null);
  readonly emailAvailable = signal<boolean | null>(null);
  readonly checkingUsername = signal<boolean>(false);
  readonly checkingEmail = signal<boolean>(false);

  // Classi disponibili per la registrazione
  readonly availableClassrooms = [
    '1IA', '1IB', '1IC', '1ID',
    '2IA', '2IB', '2IC', '2ID',
    '3IA', '3IB', '3IC', '3ID',
    '4IA', '4IB', '4IC', '4ID',
    '5IA', '5IB', '5IC', '5ID',
  ];

  // Form di registrazione
  readonly registerForm: FormGroup = this.fb.group({
    nomeCompleto: ['', [Validators.required, maxLengthValidator(100)]],
    username: ['', [Validators.required, usernameValidator()]],
    email: ['', [Validators.required, schoolEmailValidator()]],
    classroom: ['', [Validators.required]],
    password: ['', [Validators.required, passwordValidator()]],
    confirmPassword: ['', [Validators.required, matchPasswordValidator('password')]],
  });

  constructor() {
    this.setupUsernameCheck();
    this.setupEmailCheck();
  }

  /**
   * Configura la verifica real-time dell'username
   */
  private setupUsernameCheck(): void {
    const usernameControl = this.registerForm.get('username');

    if (usernameControl) {
      usernameControl.valueChanges
        .pipe(
          debounceTime(500),
          distinctUntilChanged(),
          switchMap((username) => {
            if (!username || username.length < 3) {
              this.usernameAvailable.set(null);
              return of(null);
            }

            this.checkingUsername.set(true);
            return this.userService.checkUsernameAvailability(username);
          }),
          takeUntilDestroyed()
        )
        .subscribe({
          next: (result) => {
            this.checkingUsername.set(false);
            if (result !== null) {
              this.usernameAvailable.set(result.disponibile);
            }
          },
          error: () => {
            this.checkingUsername.set(false);
            this.usernameAvailable.set(null);
          },
        });
    }
  }

  /**
   * Configura la verifica real-time dell'email
   */
  private setupEmailCheck(): void {
    const emailControl = this.registerForm.get('email');

    if (emailControl) {
      emailControl.valueChanges
        .pipe(
          debounceTime(500),
          distinctUntilChanged(),
          switchMap((email) => {
            // Verifica formato email base prima di controllare
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!email || !emailRegex.test(email)) {
              this.emailAvailable.set(null);
              return of(null);
            }

            this.checkingEmail.set(true);
            return this.userService.checkEmailAvailability(email);
          }),
          takeUntilDestroyed()
        )
        .subscribe({
          next: (result) => {
            this.checkingEmail.set(false);
            if (result !== null) {
              this.emailAvailable.set(result.disponibile);
            }
          },
          error: () => {
            this.checkingEmail.set(false);
            this.emailAvailable.set(null);
          },
        });
    }
  }

  /**
   * Ottiene il messaggio di errore per un campo
   */
  getFieldError(fieldName: string): string {
    const control = this.registerForm.get(fieldName);

    if (!control?.errors || !control.touched) {
      // Verifica disponibilità username/email
      if (fieldName === 'username' && this.usernameAvailable() === false) {
        return 'Username già in uso';
      }
      if (fieldName === 'email' && this.emailAvailable() === false) {
        return 'Email già registrata';
      }
      return '';
    }

    // Errore required
    if (control.errors['required']) {
      return `${this.getFieldLabel(fieldName)} è obbligatorio`;
    }

    // Errore email
    if (control.errors['email']) {
      return control.errors['email'].message || 'Inserisci un indirizzo email valido';
    }

    // Errore dominio email
    if (control.errors['schoolEmail']) {
      return control.errors['schoolEmail'].message;
    }

    // Errori custom
    if (control.errors['username']) {
      return control.errors['username'].message;
    }

    if (control.errors['password']) {
      return control.errors['password'].message;
    }

    if (control.errors['matchPassword']) {
      return control.errors['matchPassword'].message;
    }

    if (control.errors['maxLength']) {
      return control.errors['maxLength'].message;
    }

    return '';
  }

  /**
   * Restituisce la label del campo
   */
  private getFieldLabel(fieldName: string): string {
    const labels: Record<string, string> = {
      nomeCompleto: 'Nome completo',
      username: 'Username',
      email: 'Email',
      classroom: 'Classe',
      password: 'Password',
      confirmPassword: 'Conferma password',
    };
    return labels[fieldName] || fieldName;
  }

  /**
   * Verifica se il form è valido per il submit
   */
  isFormValid(): boolean {
    return (
      this.registerForm.valid &&
      this.usernameAvailable() !== false &&
      this.emailAvailable() !== false
    );
  }

  /**
   * Gestisce il submit del form
   */
  onSubmit(): void {
    // Marca tutti i campi come touched
    this.registerForm.markAllAsTouched();

    if (!this.isFormValid()) {
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    const { nomeCompleto, username, email, classroom, password } = this.registerForm.value;

    this.authService
      .register({ nomeCompleto, username, email, classroom, password })
      .subscribe({
        next: () => {
          this.isLoading.set(false);
          // Naviga alla pagina di verifica email
          this.router.navigate(['/auth/verify-email'], {
            queryParams: { email }
          });
        },
        error: (error) => {
          this.isLoading.set(false);

          if (error.status === 409) {
            this.errorMessage.set('Username o email già registrati.');
          } else if (error.status === 0) {
            this.errorMessage.set('Impossibile connettersi al server. Verifica la connessione.');
          } else if (error.error?.validationErrors) {
            // Errori di validazione dal backend
            const errors = Object.values(error.error.validationErrors).join(', ');
            this.errorMessage.set(errors);
          } else {
            this.errorMessage.set(
              error.error?.message || 'Errore durante la registrazione. Riprova.'
            );
          }
        },
      });
  }
}
