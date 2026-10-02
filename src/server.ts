import { AngularAppEngine, createRequestHandler } from '@angular/ssr';
import {
  getAllowedHosts,
  getContext,
  getTrustProxyHeaders,
} from '@netlify/angular-runtime/app-engine.js';

const angularAppEngine = new AngularAppEngine({
  allowedHosts: getAllowedHosts(),
  trustProxyHeaders: getTrustProxyHeaders(),
});

export async function netlifyAppEngineHandler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname === '/docs/') {
    url.pathname = '/docs';
    return Response.redirect(url, 308);
  }

  const result = await angularAppEngine.handle(request, getContext());
  return result || new Response('Not found', { status: 404 });
}

/** Shared handler for Netlify, the Angular dev server, and prerender builds. */
export const reqHandler = createRequestHandler(netlifyAppEngineHandler);
