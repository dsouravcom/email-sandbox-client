import { InjectionToken } from '@angular/core';
import { RUNTIME_API_BASE_URL } from './runtime-config.generated';

/**
 * Base URL of the NestJS API. `RUNTIME_API_BASE_URL` comes from `.env`'s
 * `API_BASE_URL` — see `scripts/generate-runtime-config.mjs`, which runs
 * before every `npm start`/`npm run build`/`npm test` and writes it into
 * `runtime-config.generated.ts` as a plain constant. Set `.env` once per
 * machine (a local `http://localhost:3000/api` in development, the real API
 * origin on a deployment) and every future build just picks it up — `.env`
 * is gitignored, so `git pull` never touches it.
 */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  factory: () => RUNTIME_API_BASE_URL,
});
