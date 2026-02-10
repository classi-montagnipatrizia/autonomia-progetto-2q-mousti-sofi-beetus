import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Validatori custom per Angular Reactive Forms
 *
 * Questi validatori si allineano alle regole di validazione del backend
 * per fornire feedback immediato all'utente prima di inviare i dati
 */

/**
 * Validatore per username
 *
 * Regole (allineate al backend):
 * - Lunghezza: min 3, max 50 caratteri
 * - Caratteri ammessi: lettere (a-z, A-Z), numeri (0-9), underscore (_)
 * - Niente spazi o caratteri speciali
 *
 * @returns ValidatorFn
 */
export function usernameValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;

    if (!value) {
      return null; // Usa required validator separatamente
    }

    // Pattern: solo lettere, numeri e underscore
    const pattern = /^\w+$/;

    if (!pattern.test(value)) {
      return {
        username: {
          message: 'Username può contenere solo lettere, numeri e underscore',
        },
      };
    }

    // Lunghezza minima
    if (value.length < 3) {
      return {
        username: {
          message: 'Username deve essere almeno 3 caratteri',
        },
      };
    }

    // Lunghezza massima
    if (value.length > 50) {
      return {
        username: {
          message: 'Username non può superare 50 caratteri',
        },
      };
    }

    return null;
  };
}

/**
 * Validatore per password
 *
 * Regole base (allineate al backend):
 * - Lunghezza minima: 8 caratteri
 * - Lunghezza massima: 20 caratteri
 * - Almeno una lettera maiuscola
 * - Almeno una lettera minuscola
 * - Almeno un numero
 *
 * @returns ValidatorFn
 */
export function passwordValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;

    if (!value) {
      return null; // Usa required validator separatamente
    }

    // Lunghezza 8-20 caratteri
    if (value.length < 8) {
      return {
        password: {
          message: 'Password deve essere almeno 8 caratteri',
        },
      };
    }

    if (value.length > 20) {
      return {
        password: {
          message: 'Password non può superare 20 caratteri',
        },
      };
    }

    // Almeno una maiuscola
    if (!/[A-Z]/.test(value)) {
      return {
        password: {
          message: 'Password deve contenere almeno una lettera maiuscola',
        },
      };
    }

    // Almeno una minuscola
    if (!/[a-z]/.test(value)) {
      return {
        password: {
          message: 'Password deve contenere almeno una lettera minuscola',
        },
      };
    }

    // Almeno un numero
    if (!/[0-9]/.test(value)) {
      return {
        password: {
          message: 'Password deve contenere almeno un numero',
        },
      };
    }

    return null;
  };
}

/**
 * Validatore per password forte
 *
 * Regole più stringenti:
 * - Almeno 8 caratteri
 * - Almeno una lettera maiuscola
 * - Almeno una lettera minuscola
 * - Almeno un numero
 * - Almeno un carattere speciale
 *
 * @returns ValidatorFn
 */
export function strongPasswordValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;

    if (!value) {
      return null;
    }

    const errors: string[] = [];

    // Lunghezza minima
    if (value.length < 8) {
      errors.push('almeno 8 caratteri');
    }

    // Lettera maiuscola
    if (!/[A-Z]/.test(value)) {
      errors.push('una lettera maiuscola');
    }

    // Lettera minuscola
    if (!/[a-z]/.test(value)) {
      errors.push('una lettera minuscola');
    }

    // Numero
    if (!/\d/.test(value)) {
      errors.push('un numero');
    }

    // Carattere speciale
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>\/?]/.test(value)) {
      errors.push('un carattere speciale');
    }

    if (errors.length > 0) {
      return {
        strongPassword: {
          message: `Password deve contenere: ${errors.join(', ')}`,
        },
      };
    }

    return null;
  };
}

/**
 * Validatore per email con dominio specifico
 *
 * Regole:
 * - Email deve terminare con @marconirovereto.it
 * - Formato email valido
 *
 * @returns ValidatorFn
 */
export function schoolEmailValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;

    if (!value) {
      return null; // Usa required validator separatamente
    }

    // Verifica formato email base
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return {
        email: {
          message: 'Inserisci un indirizzo email valido',
        },
      };
    }

    // Verifica dominio specifico
    if (!value.toLowerCase().endsWith('@marconirovereto.it')) {
      return {
        schoolEmail: {
          message: 'Devi usare un indirizzo email @marconirovereto.it',
        },
      };
    }

    return null;
  };
}

/**
 * Validatore per conferma password
 *
 * Verifica che il valore del campo corrisponda al campo password
 *
 * Uso:
 * ```typescript
 * confirmPassword: ['', [Validators.required, matchPasswordValidator('password')]]
 * ```
 *
 * @param passwordFieldName nome del campo password da confrontare
 * @returns ValidatorFn
 */
export function matchPasswordValidator(passwordFieldName: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.parent) {
      return null;
    }

    const password = control.parent.get(passwordFieldName);
    const confirmPassword = control;

    if (!password || !confirmPassword) {
      return null;
    }

    if (confirmPassword.value === '') {
      return null; // Usa required validator separatamente
    }

    if (password.value !== confirmPassword.value) {
      return {
        matchPassword: {
          message: 'Le password non corrispondono',
        },
      };
    }

    return null;
  };
}

/**
 * Validatore per lunghezza massima con conteggio caratteri
 *
 * Simile a Validators.maxLength ma fornisce un messaggio più dettagliato
 *
 * @param maxLength lunghezza massima consentita
 * @returns ValidatorFn
 */
export function maxLengthValidator(maxLength: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;

    if (!value) {
      return null;
    }

    if (value.length > maxLength) {
      return {
        maxLength: {
          message: `Massimo ${maxLength} caratteri (attualmente ${value.length})`,
          maxLength,
          actualLength: value.length,
        },
      };
    }

    return null;
  };
}

/**
 * Validatore per contenuto post/commento
 *
 * Verifica che il contenuto non sia solo spazi vuoti
 *
 * @returns ValidatorFn
 */
export function notOnlyWhitespaceValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;

    if (!value) {
      return null;
    }

    if (value.trim().length === 0) {
      return {
        whitespace: {
          message: 'Il contenuto non può essere solo spazi vuoti',
        },
      };
    }

    return null;
  };
}

/**
 * Validatore per URL
 *
 * Verifica che il valore sia un URL valido
 *
 * @returns ValidatorFn
 */
export function urlValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;

    if (!value) {
      return null;
    }

    try {
      new URL(value);
      return null;
    } catch {
      return {
        url: {
          message: 'URL non valido',
        },
      };
    }
  };
}

/**
 * Validatore per URL Cloudinary
 *
 * Verifica che l'URL provenga da Cloudinary
 *
 * @returns ValidatorFn
 */
export function cloudinaryUrlValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;

    if (!value) {
      return null;
    }

    const cloudinaryPattern = /^https?:\/\/res\.cloudinary\.com\/.+/;

    if (!cloudinaryPattern.test(value)) {
      return {
        cloudinaryUrl: {
          message: "L'URL deve essere di Cloudinary",
        },
      };
    }

    return null;
  };
}

/**
 * Validatore per menzioni (@username)
 *
 * Conta le menzioni in un testo e verifica che non superino il limite
 *
 * @param maxMentions numero massimo di menzioni consentite (default 10)
 * @returns ValidatorFn
 */
export function mentionsValidator(maxMentions: number = 10): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;

    if (!value) {
      return null;
    }

    // Pattern per trovare menzioni @username
    const mentionPattern = /@\w+/g;
    const mentions = value.match(mentionPattern);

    if (mentions && mentions.length > maxMentions) {
      return {
        mentions: {
          message: `Massimo ${maxMentions} menzioni per post`,
          maxMentions,
          actualMentions: mentions.length,
        },
      };
    }

    return null;
  };
}

/**
 * Validatore per numero di parole
 *
 * Verifica che il testo non superi un numero massimo di parole
 *
 * @param maxWords numero massimo di parole
 * @returns ValidatorFn
 */
export function maxWordsValidator(maxWords: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;

    if (!value) {
      return null;
    }

    const words = value.trim().split(/\s+/);
    const wordCount = words.filter((word: string) => word.length > 0).length;

    if (wordCount > maxWords) {
      return {
        maxWords: {
          message: `Massimo ${maxWords} parole (attualmente ${wordCount})`,
          maxWords,
          actualWords: wordCount,
        },
      };
    }

    return null;
  };
}

/**
 * Validatore per numeri in un range
 *
 * @param min valore minimo
 * @param max valore massimo
 * @returns ValidatorFn
 */
export function rangeValidator(min: number, max: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;

    if (value === null || value === undefined || value === '') {
      return null;
    }

    const numValue = Number(value);

    if (Number.isNaN(numValue)) {
      return {
        range: {
          message: 'Deve essere un numero valido',
        },
      };
    }

    if (numValue < min || numValue > max) {
      return {
        range: {
          message: `Il valore deve essere tra ${min} e ${max}`,
          min,
          max,
          actual: numValue,
        },
      };
    }

    return null;
  };
}

/**
 * Validatore per file upload
 *
 * Verifica tipo e dimensione file
 *
 * @param allowedTypes tipi MIME consentiti
 * @param maxSizeMB dimensione massima in MB
 * @returns ValidatorFn
 */
export function fileValidator(allowedTypes: string[], maxSizeMB: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const file = control.value as File;

    if (!file) {
      return null;
    }

    // Verifica tipo
    if (!allowedTypes.includes(file.type)) {
      return {
        fileType: {
          message: `Tipo file non supportato. Usa: ${allowedTypes.join(', ')}`,
          allowedTypes,
          actualType: file.type,
        },
      };
    }

    // Verifica dimensione
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return {
        fileSize: {
          message: `File troppo grande. Massimo ${maxSizeMB}MB`,
          maxSize: maxSizeMB,
          actualSize: Math.round((file.size / 1024 / 1024) * 100) / 100,
        },
      };
    }

    return null;
  };
}

/**
 * Validatore per verificare che almeno un campo sia compilato
 *
 * Uso a livello di FormGroup
 *
 * @param fieldNames nomi dei campi da verificare
 * @returns ValidatorFn
 */
export function atLeastOneFieldValidator(fieldNames: string[]): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const hasValue = fieldNames.some((fieldName) => {
      const field = control.get(fieldName);
      return field?.value?.toString()?.trim()?.length > 0;
    });

    return hasValue
      ? null
      : {
          atLeastOne: {
            message: `Almeno uno dei seguenti campi è obbligatorio: ${fieldNames.join(', ')}`,
          },
        };
  };
}
