import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * The current pages depend on the signed-in user, and only the browser holds
 * the session (httpOnly refresh cookie + in-memory access token), so they are
 * rendered client-side. Public pages added later (e.g. blog posts) can use
 * `RenderMode.Server` or `RenderMode.Prerender`.
 */
export const serverRoutes: ServerRoute[] = [
  {
    path: '**',
    renderMode: RenderMode.Client,
  },
];
