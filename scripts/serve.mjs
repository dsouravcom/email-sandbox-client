import { spawn } from 'node:child_process';

// `ng serve` reads process.env.PORT itself if it's set — this just makes
// sure .env's PORT is actually in process.env before ng starts, the same
// way `generate-runtime-config.mjs` (already run as the `prestart` hook)
// makes API_BASE_URL available to the app bundle.
try {
  process.loadEnvFile();
} catch {
  // generate-runtime-config.mjs (prestart) already reported this; nothing
  // new to say here.
}

// The whole command is one string (rather than a separate args array) so
// Node doesn't warn about combining `shell: true` with argv — ng needs a
// shell on Windows to resolve its .cmd shim, and there's no user input here
// to make that unsafe.
const ng = spawn('ng serve', { stdio: 'inherit', shell: true, env: process.env });
ng.on('exit', (code) => process.exit(code ?? 0));
