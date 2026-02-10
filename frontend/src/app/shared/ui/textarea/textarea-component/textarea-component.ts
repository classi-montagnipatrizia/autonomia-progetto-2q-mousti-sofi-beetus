import { Component, input, computed, output, signal, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * Dimensioni della textarea
 */
export type TextareaSize = 'sm' | 'md' | 'lg';

/**
 * Modalità di resize
 */
export type TextareaResize = 'none' | 'vertical' | 'horizontal' | 'both';

@Component({
  selector: 'app-textarea-component',
  imports: [CommonModule],
  templateUrl: './textarea-component.html',
  styleUrl: './textarea-component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TextareaComponent),
      multi: true,
    },
  ],
})
export class TextareaComponent implements ControlValueAccessor {
  /**
   * Label del campo
   */
  readonly label = input<string>('');

  /**
   * Placeholder del campo
   */
  readonly placeholder = input<string>('');

  /**
   * Dimensione della textarea
   * @default 'md'
   */
  readonly size = input<TextareaSize>('md');

  /**
   * Numero di righe visibili
   * @default 4
   */
  readonly rows = input<number>(4);

  /**
   * Messaggio di errore da mostrare
   */
  readonly error = input<string>('');

  /**
   * Testo di aiuto sotto la textarea
   */
  readonly hint = input<string>('');

  /**
   * Disabilita la textarea
   * @default false
   */
  readonly disabled = input<boolean>(false);

  /**
   * Textarea in sola lettura
   * @default false
   */
  readonly readonly = input<boolean>(false);

  /**
   * Campo obbligatorio (mostra asterisco)
   * @default false
   */
  readonly required = input<boolean>(false);

  /**
   * Numero massimo di caratteri
   */
  readonly maxLength = input<number | undefined>(undefined);

  /**
   * Mostra contatore caratteri
   * @default false
   */
  readonly showCounter = input<boolean>(false);

  /**
   * Modalità di resize
   * @default 'vertical'
   */
  readonly resize = input<TextareaResize>('vertical');

  /**
   * ID univoco per il campo
   */
  readonly textareaId = input<string>(`textarea-${Math.random().toString(36).slice(2, 9)}`);

  /**
   * Evento emesso quando la textarea perde il focus
   */
  readonly blurred = output<FocusEvent>();

  /**
   * Evento emesso quando la textarea riceve il focus
   */
  readonly focused = output<FocusEvent>();

  // State interno
  readonly value = signal<string>('');
  readonly isFocused = signal<boolean>(false);
  private readonly isDisabledByForm = signal<boolean>(false);

  // Callbacks per ControlValueAccessor
  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  /**
   * Verifica se la textarea è in stato di errore
   */
  readonly hasError = computed(() => !!this.error());

  /**
   * Verifica se la textarea è effettivamente disabilitata
   */
  readonly isDisabled = computed(() => this.disabled() || this.isDisabledByForm());

  /**
   * Conteggio caratteri corrente
   */
  readonly charCount = computed(() => this.value().length);

  /**
   * Verifica se il limite caratteri è superato
   */
  readonly isOverLimit = computed(() => {
    const max = this.maxLength();
    return max !== undefined && this.charCount() > max;
  });

  /**
   * Testo del contatore
   */
  readonly counterText = computed(() => {
    const count = this.charCount();
    const max = this.maxLength();

    if (max !== undefined) {
      return `${count}/${max}`;
    }
    return `${count}`;
  });

  /**
   * Classi CSS per il wrapper della textarea
   */
  readonly wrapperClasses = computed(() => {
    const base = 'relative w-full rounded-lg border transition-all duration-200';

    // Stato errore
    if (this.hasError() || this.isOverLimit()) {
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
   * Classi CSS per la textarea
   */
  readonly textareaClasses = computed(() => {
    const base =
      'w-full bg-transparent outline-none text-gray-900 placeholder-gray-400 dark:text-gray-100 dark:placeholder-gray-500 rounded-lg';

    const sizeMap: Record<TextareaSize, string> = {
      sm: 'text-sm p-2.5',
      md: 'text-base p-3',
      lg: 'text-lg p-4',
    };

    const resizeMap: Record<TextareaResize, string> = {
      none: 'resize-none',
      vertical: 'resize-y',
      horizontal: 'resize-x',
      both: 'resize',
    };

    // Cursor per disabled
    const cursor = this.isDisabled() ? 'cursor-not-allowed' : '';

    return `${base} ${sizeMap[this.size()]} ${resizeMap[this.resize()]} ${cursor}`;
  });

  /**
   * Classi CSS per il contatore
   */
  readonly counterClasses = computed(() => {
    if (this.isOverLimit()) {
      return 'text-error-500 font-medium';
    }
    return 'text-gray-500 dark:text-gray-400';
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
    const target = event.target as HTMLTextAreaElement;
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
}
