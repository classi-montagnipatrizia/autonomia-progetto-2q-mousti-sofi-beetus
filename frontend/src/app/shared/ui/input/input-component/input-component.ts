import { Component, input, computed, output, signal, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { LucideAngularModule, LucideIconData, Eye, EyeOff } from 'lucide-angular';

/**
 * Tipi di input supportati
 */
export type InputType = 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search';

/**
 * Dimensioni dell'input
 */
export type InputSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-input-component',
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './input-component.html',
  styleUrl: './input-component.scss',
providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputComponent),
      multi: true,
    },
  ],
})
export class InputComponent implements ControlValueAccessor {
  // Icone per toggle password
  readonly Eye = Eye;
  readonly EyeOff = EyeOff;

  /**
   * Tipo di input HTML
   * @default 'text'
   */
  readonly type = input<InputType>('text');

  /**
   * Label del campo
   */
  readonly label = input<string>('');

  /**
   * Placeholder del campo
   */
  readonly placeholder = input<string>('');

  /**
   * Dimensione dell'input
   * @default 'md'
   */
  readonly size = input<InputSize>('md');

  /**
   * Messaggio di errore da mostrare
   */
  readonly error = input<string>('');

  /**
   * Testo di aiuto sotto l'input
   */
  readonly hint = input<string>('');

  /**
   * Disabilita l'input
   * @default false
   */
  readonly disabled = input<boolean>(false);

  /**
   * Input in sola lettura
   * @default false
   */
  readonly readonly = input<boolean>(false);

  /**
   * Campo obbligatorio (mostra asterisco)
   * @default false
   */
  readonly required = input<boolean>(false);

  /**
   * Icona a sinistra
   */
  readonly iconLeft = input<LucideIconData | undefined>(undefined);

  /**
   * Icona a destra
   */
  readonly iconRight = input<LucideIconData | undefined>(undefined);

  /**
   * ID univoco per il campo (per label)
   */
  readonly inputId = input<string>(`input-${Math.random().toString(36).slice(2, 9)}`);

  /**
   * Autocomplete attribute
   */
  readonly autocomplete = input<string>('off');

  /**
   * Evento emesso quando l'input perde il focus
   */
  readonly blurred = output<FocusEvent>();

  /**
   * Evento emesso quando l'input riceve il focus
   */
  readonly focused = output<FocusEvent>();

  // State interno
  readonly value = signal<string>('');
  readonly isFocused = signal<boolean>(false);
  readonly showPassword = signal<boolean>(false);
  private readonly isDisabledByForm = signal<boolean>(false);

  // Callbacks per ControlValueAccessor
  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  /**
   * Tipo effettivo dell'input (per toggle password)
   */
  readonly effectiveType = computed(() => {
    if (this.type() === 'password' && this.showPassword()) {
      return 'text';
    }
    return this.type();
  });

  /**
   * Verifica se mostrare il toggle password
   */
  readonly showPasswordToggle = computed(() => this.type() === 'password');

  /**
   * Verifica se l'input è in stato di errore
   */
  readonly hasError = computed(() => !!this.error());

  /**
   * Verifica se l'input è effettivamente disabilitato
   */
  readonly isDisabled = computed(() => this.disabled() || this.isDisabledByForm());

  /**
   * Classi CSS per il container
   */
  readonly containerClasses = computed(() => {
    return 'flex flex-col gap-1.5 w-full';
  });

  /**
   * Classi CSS per il wrapper dell'input
   */
  readonly wrapperClasses = computed(() => {
    const base = 'relative flex items-center w-full rounded-lg border transition-all duration-200';

    // Stato errore
    if (this.hasError()) {
      return `${base} border-error-500 ring-2 ring-error-500/20`;
    }

    // Stato focus
    if (this.isFocused()) {
      return `${base} border-primary-500 ring-2 ring-primary-500/20`;
    }

    // Stato disabled
    if (this.isDisabled()) {
      return `${base} border-gray-200 bg-gray-50 cursor-not-allowed dark:border-gray-700 dark:bg-gray-800/50`;
    }

    // Stato default
    return `${base} border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500 bg-white dark:bg-gray-800`;
  });

  /**
   * Classi CSS per l'input
   */
  readonly inputClasses = computed(() => {
    const base = 'w-full bg-transparent outline-none text-gray-900 placeholder-gray-400 dark:text-gray-100 dark:placeholder-gray-500';

    const sizeMap: Record<InputSize, string> = {
      sm: 'h-9 text-sm px-3',
      md: 'h-10 text-base px-4',
      lg: 'h-12 text-lg px-5',
    };

    // Padding extra per icone
    const paddingLeft = this.iconLeft() ? 'pl-10' : '';
    const paddingRight = this.iconRight() || this.showPasswordToggle() ? 'pr-10' : '';

    // Cursor per disabled
    const cursor = this.isDisabled() ? 'cursor-not-allowed' : '';

    return `${base} ${sizeMap[this.size()]} ${paddingLeft} ${paddingRight} ${cursor}`;
  });

  /**
   * Classi CSS per le icone
   */
  readonly iconClasses = computed(() => {
    const base = 'absolute text-gray-400 dark:text-gray-500 pointer-events-none';

    if (this.hasError()) {
      return `${base} text-error-500`;
    }

    if (this.isFocused()) {
      return `${base} text-primary-500`;
    }

    return base;
  });

  /**
   * Dimensione delle icone in base alla size
   */
  readonly iconSize = computed(() => {
    const sizeMap: Record<InputSize, number> = {
      sm: 16,
      md: 18,
      lg: 20,
    };
    return sizeMap[this.size()];
  });

  // ControlValueAccessor implementation
  writeValue(value: string): void {
    this.value.set(value || '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabledByForm.set(isDisabled);
  }

  /**
   * Handler per input value change
   */
  onInputChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const newValue = target.value;
    this.value.set(newValue);
    this.onChange(newValue);
  }

  /**
   * Handler per focus
   */
  onFocus(event: FocusEvent): void {
    this.isFocused.set(true);
    this.focused.emit(event);
  }

  /**
   * Handler per blur
   */
  onBlur(event: FocusEvent): void {
    this.isFocused.set(false);
    this.onTouched();
    this.blurred.emit(event);
  }

  /**
   * Toggle visibilità password
   */
  togglePasswordVisibility(): void {
    this.showPassword.update((show) => !show);
  }
}
