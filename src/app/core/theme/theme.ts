import { isPlatformBrowser } from '@angular/common';
import { effect, inject, PLATFORM_ID, Service, signal } from '@angular/core';

export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'theme-preference';

/**
 * Applies the user's light/dark/system choice as `data-theme` on `<html>`
 * (matching the two custom daisyUI themes in `styles.css`), and persists it.
 * "System" is implemented by simply removing the attribute: the themes'
 * `prefersdark`/`default` CSS media queries then take over, so OS theme
 * changes are picked up live with no extra listener needed. A blocking
 * inline script in `index.html` applies the stored choice before Angular
 * bootstraps, so switching themes never flashes the wrong one.
 */
@Service()
export class Theme {
  private readonly platformId = inject(PLATFORM_ID);

  readonly preference = signal<ThemePreference>(this.readStored());

  constructor() {
    effect(() => this.apply(this.preference()));
  }

  setPreference(preference: ThemePreference): void {
    this.preference.set(preference);
    if (isPlatformBrowser(this.platformId)) {
      try {
        localStorage.setItem(STORAGE_KEY, preference);
      } catch {
        // Storage unavailable (private browsing, etc.) — the choice just won't persist.
      }
    }
  }

  private readStored(): ThemePreference {
    if (!isPlatformBrowser(this.platformId)) return 'system';
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === 'light' || stored === 'dark' ? stored : 'system';
    } catch {
      return 'system';
    }
  }

  private apply(preference: ThemePreference): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const root = document.documentElement;
    if (preference === 'system') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', preference === 'light' ? 'sandboxlight' : 'sandboxdark');
    }
  }
}
