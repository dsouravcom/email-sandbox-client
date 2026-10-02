import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';
import { RUNTIME_SITE_URL } from './app/core/http/runtime-config.generated';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine({
  allowedHosts: [new URL(RUNTIME_SITE_URL).hostname, 'localhost', '127.0.0.1'],
});
const privatePage =
  /^\/(?:mailboxes|mailbox|organization|profile|login|register|verify-email|login-verify|forgot-password|reset-password)(?:\/|$)/;
app.disable('x-powered-by');
app.use((req, res, next) => {
  if (req.path === '/docs/') {
    res.redirect(308, '/docs');
    return;
  }
  if (privatePage.test(req.path)) {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.setHeader('Cache-Control', 'private, no-store');
  }
  next();
});

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1h',
    index: false,
    redirect: false,
    setHeaders(res, path) {
      if (/\.(?:html|txt|xml|md)$/.test(path))
        res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      if (/-[A-Za-z0-9_-]{8,}\.(?:js|css)$/.test(path))
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      if (/\.(?:txt|md)$/.test(path)) res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    },
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) => (response ? writeResponseToNodeResponse(response, res) : next()))
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
