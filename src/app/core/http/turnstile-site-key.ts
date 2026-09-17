import { InjectionToken } from '@angular/core';
import { RUNTIME_TURNSTILE_SITE_KEY } from './runtime-config.generated';

/**
 * Cloudflare Turnstile site key shown on the register page. Comes from
 * `.env`'s `TURNSTILE_SITE_KEY` — see `scripts/generate-runtime-config.mjs`
 * and `api-base-url.ts` for the same pattern.
 */
export const TURNSTILE_SITE_KEY = new InjectionToken<string>('TURNSTILE_SITE_KEY', {
  factory: () => RUNTIME_TURNSTILE_SITE_KEY,
});
