import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule, MailCheck, CircleCheck } from 'lucide-angular';
import { InputComponent } from '../../../../shared/ui/input/input-component/input-component';
import { ButtonComponent } from '../../../../shared/ui/button/button-component/button-component';
import { AuthService } from '../../../../core/auth/services/auth-service';
import { ToastService } from '../../../../core/services/toast-service';
import { matchPasswordValidator, passwordValidator } from '../../../../core/utils/validators';

/**
 * Step del processo di reset password
 * - request: Richiedi il link via email
 * - sent: Conferma email inviata
 * - reset: Inserisci nuova password (con token)
 * - success: Password cambiata con successo
 */
type ResetStep = 'request' | 'sent' | 'reset' | 'success';

@Component({
  selector: 'app-reset-password-component',
  imports: [ CommonModule,
    ReactiveFormsModule,
    RouterLink,
    LucideAngularModule,
    InputComponent,
    ButtonComponent,],
  templateUrl: './reset-password-component.html',
  styleUrl: './reset-password-component.scss',
})
export class ResetPasswordComponent implements OnInit{
 private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);

  // Icone Lucide
  readonly MailCheckIcon = MailCheck;
  readonly CheckCircleIcon = CircleCheck;

  // Stato UI
  readonly currentStep = signal<ResetStep>('request');
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string>('');
  readonly submittedEmail = signal<string>('');
  private resetToken: string | null = null;

  // Form richiesta reset
  readonly requestForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  // Form nuova password
  readonly resetForm: FormGroup = this.fb.group({
    password: ['', [Validators.required, passwordValidator()]],
    confirmPassword: ['', [Validators.required, matchPasswordValidator('password')]],
  });

  ngOnInit(): void {
    // Verifica se c'è un token nella URL (step 3)
    this.route.queryParams.subscribe((params) => {
      const token = params['token'];

      if (token) {
        this.resetToken = token;
        this.validateToken(token);
      }
    });
  }

  /**
   * Valida il token di reset
   */
  private validateToken(token: string): void {
    this.isLoading.set(true);

    this.authService.validateResetToken(token).subscribe({
      next: (result) => {
        this.isLoading.set(false);

        if (result.valid) {
          this.currentStep.set('reset');
        } else {
          this.errorMessage.set('Il link è scaduto o non valido. Richiedi un nuovo reset.');
          this.currentStep.set('request');
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.errorMessage.set('Il link è scaduto o non valido. Richiedi un nuovo reset.');
        this.currentStep.set('request');
      },
    });
  }

  /**
   * Ottiene il messaggio di errore per un campo del requestForm
   */
  getRequestFieldError(fieldName: string): string {
    const control = this.requestForm.get(fieldName);

    if (!control?.errors || !control.touched) {
      return '';
    }

    if (control.errors['required']) {
      return 'Email è obbligatoria';
    }

    if (control.errors['email']) {
      return 'Inserisci un indirizzo email valido';
    }

    return '';
  }

  /**
   * Ottiene il messaggio di errore per un campo del resetForm
   */
  getResetFieldError(fieldName: string): string {
    const control = this.resetForm.get(fieldName);

    if (!control?.errors || !control.touched) {
      return '';
    }

    if (control.errors['required']) {
      return fieldName === 'password' ? 'Password è obbligatoria' : 'Conferma password è obbligatoria';
    }

    if (control.errors['password']) {
      return control.errors['password'].message;
    }

    if (control.errors['matchPassword']) {
      return control.errors['matchPassword'].message;
    }

    return '';
  }

  /**
   * Step 1: Invia richiesta reset password
   */
  onRequestSubmit(): void {
    this.requestForm.markAllAsTouched();

    if (this.requestForm.invalid) {
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    const email = this.requestForm.value.email;
    this.submittedEmail.set(email);

    this.authService.requestPasswordReset(email).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.currentStep.set('sent');
      },
      error: (error) => {
        this.isLoading.set(false);

        // Non riveliamo se l'email esiste o meno per sicurezza
        // Mostriamo comunque il messaggio di successo
        if (error.status === 404) {
          // L'email non esiste, ma mostriamo lo stesso messaggio
          this.currentStep.set('sent');
        } else if (error.status === 0) {
          this.errorMessage.set('Impossibile connettersi al server. Verifica la connessione.');
        } else {
          this.errorMessage.set(error.error?.message || "Errore durante l'invio. Riprova.");
        }
      },
    });
  }

  /**
   * Step 3: Imposta nuova password
   */
  onResetSubmit(): void {
    this.resetForm.markAllAsTouched();

    if (this.resetForm.invalid || !this.resetToken) {
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    const password = this.resetForm.value.password;

    this.authService.confirmPasswordReset(this.resetToken, password).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.currentStep.set('success');
        this.toastService.success('Password aggiornata con successo!');
      },
      error: (error) => {
        this.isLoading.set(false);

        if (error.status === 400) {
          this.errorMessage.set('Il link è scaduto. Richiedi un nuovo reset.');
        } else if (error.status === 0) {
          this.errorMessage.set('Impossibile connettersi al server. Verifica la connessione.');
        } else {
          this.errorMessage.set(error.error?.message || 'Errore durante il reset. Riprova.');
        }
      },
    });
  }

  /**
   * Naviga al login
   */
  goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  /**
   * Torna allo step di richiesta
   */
  backToRequest(): void {
    this.currentStep.set('request');
    this.errorMessage.set('');
    this.requestForm.reset();
  }
}
