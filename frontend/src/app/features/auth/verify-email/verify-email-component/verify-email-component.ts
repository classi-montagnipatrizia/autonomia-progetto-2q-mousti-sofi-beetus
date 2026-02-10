import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../../core/auth/services/auth-service';
import { ToastService } from '../../../../core/services/toast-service';
import { ThemeStore } from '../../../../core/stores/theme-store';
import { ButtonComponent } from '../../../../shared/ui/button/button-component/button-component';
import { InputComponent } from '../../../../shared/ui/input/input-component/input-component';
import { schoolEmailValidator } from '../../../../core/utils/validators';

@Component({
  selector: 'app-verify-email',
  imports: [CommonModule, RouterLink, ButtonComponent, InputComponent, ReactiveFormsModule],
  templateUrl: './verify-email-component.html',
  styleUrl: './verify-email-component.scss',
})
export class VerifyEmailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly themeStore = inject(ThemeStore);
  private readonly fb = inject(FormBuilder);

  readonly isLoading = signal<boolean>(true);
  readonly isSuccess = signal<boolean>(false);
  readonly errorMessage = signal<string>('');
  readonly isResending = signal<boolean>(false);
  readonly showResendForm = signal<boolean>(false);

  // Stato per quando l'utente arriva dalla registrazione (senza token)
  readonly isPendingVerification = signal<boolean>(false);
  readonly userEmail = signal<string>('');

  readonly resendForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, schoolEmailValidator()]],
  });

  ngOnInit(): void {
    // Estrae il token e l'email dai query params
    const token = this.route.snapshot.queryParamMap.get('token');
    const email = this.route.snapshot.queryParamMap.get('email');

    if (!token && email) {
      // Scenario: utente arriva dalla registrazione
      this.isLoading.set(false);
      this.isPendingVerification.set(true);
      this.userEmail.set(email);
      this.resendForm.patchValue({ email });
      return;
    }

    if (!token) {
      this.isLoading.set(false);
      this.errorMessage.set('Token di verifica non valido o mancante.');
      return;
    }

    // Chiama il backend per verificare l'email
    this.authService.verifyEmail(token).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        this.isSuccess.set(true);
        this.toastService.success(
          response.message || 'Email verificata con successo!'
        );

        // Redirect rimosso - l'utente decide quando andare al login
      },
      error: (error) => {
        this.isLoading.set(false);
        this.isSuccess.set(false);

        if (error.status === 400) {
          this.errorMessage.set(
            error.error?.message || 'Token non valido, scaduto o già utilizzato.'
          );
        } else if (error.status === 0) {
          this.errorMessage.set(
            'Impossibile connettersi al server. Verifica la connessione.'
          );
        } else {
          this.errorMessage.set(
            error.error?.message || 'Errore durante la verifica. Riprova.'
          );
        }
      },
    });
  }

  navigateToLogin(): void {
    this.router.navigate(['/auth/login']);
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
        this.resendForm.reset();
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

  getFieldError(fieldName: string): string {
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
