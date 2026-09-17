import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Runs before every `npm start`/`npm run build`/`npm test` (see the pre*
// hooks in package.json), turning API_BASE_URL/TURNSTILE_SITE_KEY into real
// TS constants the app imports — see ../src/app/core/http/api-base-url.ts.
//
// Locally and on a VPS, those come from client/.env (gitignored). On a host
// like Netlify/Vercel/CI there is no .env file at all — the platform injects
// the same variables straight into process.env instead — so a missing .env
// file here is not itself an error; only actually-missing variables are.
try {
  process.loadEnvFile();
} catch {
  // No .env file: fine when the platform sets these directly (see above).
}

const apiBaseUrl = process.env.API_BASE_URL;
if (!apiBaseUrl) {
  console.error(
    'API_BASE_URL is not set. Set it in client/.env locally (copy client/.env.example), ' +
      'or as an environment variable in your hosting platform/CI.',
  );
  process.exit(1);
}

const turnstileSiteKey = process.env.TURNSTILE_SITE_KEY;
if (!turnstileSiteKey) {
  console.error(
    'TURNSTILE_SITE_KEY is not set. Set it in client/.env locally (copy client/.env.example), ' +
      'or as an environment variable in your hosting platform/CI.',
  );
  process.exit(1);
}

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'app', 'core', 'http');
const outFile = join(outDir, 'runtime-config.generated.ts');

writeFileSync(
  outFile,
  '// AUTO-GENERATED from .env by scripts/generate-runtime-config.mjs.\n' +
    '// Do not edit by hand and do not commit this file.\n' +
    `export const RUNTIME_API_BASE_URL = ${JSON.stringify(apiBaseUrl)};\n` +
    `export const RUNTIME_TURNSTILE_SITE_KEY = ${JSON.stringify(turnstileSiteKey)};\n`,
);
