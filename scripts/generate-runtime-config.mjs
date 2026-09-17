import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Runs before every `npm start`/`npm run build`/`npm test` (see the pre*
// hooks in package.json), turning .env's API_BASE_URL into a real TS
// constant the app imports — see ../src/app/core/http/api-base-url.ts.
try {
  process.loadEnvFile();
} catch {
  console.error(
    'client/.env not found. Copy client/.env.example to client/.env and fill in API_BASE_URL first.',
  );
  process.exit(1);
}

const apiBaseUrl = process.env.API_BASE_URL;
if (!apiBaseUrl) {
  console.error('API_BASE_URL is not set in client/.env.');
  process.exit(1);
}

const turnstileSiteKey = process.env.TURNSTILE_SITE_KEY;
if (!turnstileSiteKey) {
  console.error('TURNSTILE_SITE_KEY is not set in client/.env.');
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
