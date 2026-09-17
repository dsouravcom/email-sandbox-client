import {
  afterNextRender,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';

interface TurnstileRenderOptions {
  sitekey: string;
  callback: (token: string) => void;
  'expired-callback'?: () => void;
  'error-callback'?: () => void;
}

declare global {
  interface Window {
    turnstile?: {
      render(container: HTMLElement, options: TurnstileRenderOptions): string;
      reset(widgetId: string): void;
      remove(widgetId: string): void;
    };
  }
}

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
/** Shared across every widget on the page, so the script tag is only added once. */
let scriptPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  scriptPromise ??= new Promise((resolve, reject) => {
    if (window.turnstile) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.addEventListener('load', () => resolve());
    script.addEventListener('error', () => reject(new Error('Failed to load the Turnstile script')));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/**
 * Cloudflare Turnstile challenge widget, shown on the register form. Emits
 * the solved token on `verified`; emits `expired` when the token expires or
 * the widget fails to load, so the parent form knows to require a fresh one.
 */
@Component({
  selector: 'app-turnstile',
  template: `<div #container></div>`,
})
export class Turnstile {
  readonly siteKey = input.required<string>();
  readonly verified = output<string>();
  readonly expired = output<void>();

  private readonly container = viewChild.required<ElementRef<HTMLDivElement>>('container');
  private widgetId: string | null = null;

  constructor() {
    // Only ever runs in the browser: the widget needs a real DOM and network access.
    afterNextRender(() => void this.render());
    inject(DestroyRef).onDestroy(() => {
      if (this.widgetId) {
        window.turnstile?.remove(this.widgetId);
      }
    });
  }

  /** Discards the current token and shows a fresh challenge, e.g. after a failed submission. */
  reset(): void {
    if (this.widgetId) {
      window.turnstile?.reset(this.widgetId);
    }
  }

  private async render(): Promise<void> {
    try {
      await loadTurnstileScript();
    } catch {
      this.expired.emit();
      return;
    }

    this.widgetId = window.turnstile!.render(this.container().nativeElement, {
      sitekey: this.siteKey(),
      callback: (token) => this.verified.emit(token),
      'expired-callback': () => this.expired.emit(),
      'error-callback': () => this.expired.emit(),
    });
  }
}
