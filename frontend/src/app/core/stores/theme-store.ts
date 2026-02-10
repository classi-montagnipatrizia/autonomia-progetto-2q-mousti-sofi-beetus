import { computed, effect, Injectable, signal } from '@angular/core';

/**
 * Tipi di tema disponibili
 */
export type Theme = 'light' | 'dark';

/**
 * Chiave localStorage per salvare la preferenza tema
 */
const THEME_STORAGE_KEY = 'app-theme';

@Injectable({
  providedIn: 'root',
})
export class ThemeStore {
  // ============================================================================
  // SIGNALS PRIVATI
  // ============================================================================

  private readonly _currentTheme = signal<Theme>(this.getInitialTheme());

  // SIGNALS PUBBLICI READONLY

  readonly currentTheme = this._currentTheme.asReadonly();

  // ============================================================================
  // COMPUTED SIGNALS
  // ============================================================================

  /** Verifica se il tema corrente è dark */
  readonly isDark = computed(() => this._currentTheme() === 'dark');

  /** Verifica se il tema corrente è light */
  readonly isLight = computed(() => this._currentTheme() === 'light');

  // ============================================================================
  // COSTRUTTORE - Setup Effect
  // ============================================================================

  constructor() {
    // Effect che applica il tema al DOM quando cambia
    effect(() => {
      const theme = this._currentTheme();
      this.applyTheme(theme);
    });
  }

  // ============================================================================
  // METODI PUBBLICI - Gestione Tema
  // ============================================================================

  /**
   * Imposta un tema specifico
   *
   * @param theme tema da impostare ('light' | 'dark')
   */
  setTheme(theme: Theme): void {
    this._currentTheme.set(theme);
    this.saveThemePreference(theme);
  }

  /**
   * Alterna tra light e dark mode (toggle)
   */
  toggleTheme(): void {
    const newTheme = this._currentTheme() === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
  }

  /**
   * Attiva il tema dark
   */
  setDarkTheme(): void {
    this.setTheme('dark');
  }

  /**
   * Attiva il tema light
   */
  setLightTheme(): void {
    this.setTheme('light');
  }

  /**
   * Usa la preferenza di sistema
   * Rileva automaticamente se l'utente preferisce dark mode
   */
  useSystemPreference(): void {
    const systemPrefersDark = this.getSystemPreference();
    this.setTheme(systemPrefersDark ? 'dark' : 'light');
  }

  /**
   * Rimuove la preferenza salvata e usa quella di sistema
   */
  resetToSystemPreference(): void {
    localStorage.removeItem(THEME_STORAGE_KEY);
    this.useSystemPreference();
  }

  // ============================================================================
  // METODI PRIVATI - Gestione Tema
  // ============================================================================

  /**
   * Determina il tema iniziale al caricamento dell'app
   *
   * Priorità:
   * 1. Preferenza salvata in localStorage
   * 2. Preferenza di sistema
   * 3. Light theme (default)
   */
  private getInitialTheme(): Theme {
    // Controlla localStorage
    const savedTheme = this.getSavedThemePreference();
    if (savedTheme) {
      return savedTheme;
    }

    // Usa preferenza di sistema
    const systemPrefersDark = this.getSystemPreference();
    return systemPrefersDark ? 'dark' : 'light';
  }

  /**
   * Ottiene la preferenza tema salvata in localStorage
   */
  private getSavedThemePreference(): Theme | null {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
    return null;
  }

  /**
   * Salva la preferenza tema in localStorage
   */
  private saveThemePreference(theme: Theme): void {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }

  /**
   * Rileva la preferenza di sistema
   * Usa la media query prefers-color-scheme
   */
  private getSystemPreference(): boolean {
    if (globalThis.window === undefined) {
      return false;
    }

    return globalThis.window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  /**
   * Applica il tema al DOM
   *
   * Per Tailwind CSS:
   * - Aggiunge classe 'dark' all'elemento <html> per dark mode
   * - Rimuove classe 'dark' per light mode
   */
  private applyTheme(theme: Theme): void {
    const htmlElement = document.documentElement;

    if (theme === 'dark') {
      htmlElement.classList.add('dark');
      htmlElement.dataset['theme'] = 'dark';
    } else {
      htmlElement.classList.remove('dark');
      htmlElement.dataset['theme'] = 'light';
    }
  }

  // ============================================================================
  // METODI PUBBLICI - Utility
  // ============================================================================

  /**
   * Verifica se c'è una preferenza salvata
   */
  hasSavedPreference(): boolean {
    return localStorage.getItem(THEME_STORAGE_KEY) !== null;
  }

  /**
   * Ottiene la preferenza di sistema corrente
   */
  getSystemThemePreference(): Theme {
    return this.getSystemPreference() ? 'dark' : 'light';
  }

  /**
   * Ascolta i cambiamenti della preferenza di sistema
   * Utile se vuoi sincronizzare automaticamente con le impostazioni OS
   *
   * @param callback funzione chiamata quando cambia la preferenza di sistema
   * @returns funzione per rimuovere il listener
   */
  watchSystemPreference(callback: (prefersDark: boolean) => void): () => void {
    if (globalThis.window === undefined) {
      return () => {};
    }

    const mediaQuery = globalThis.window.matchMedia('(prefers-color-scheme: dark)');

    const handler = (event: MediaQueryListEvent) => {
      callback(event.matches);
    };

    // Aggiunge il listener
    mediaQuery.addEventListener('change', handler);

    // Restituisce funzione di cleanup
    return () => {
      mediaQuery.removeEventListener('change', handler);
    };
  }
}
