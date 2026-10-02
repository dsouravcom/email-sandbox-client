import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Public content is delivered as build-time HTML. Account pages remain client-only.
 */
export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'docs', renderMode: RenderMode.Prerender },
  ...[
    'mailboxes',
    'mailbox/:mailboxId',
    'mailbox/:mailboxId/email/:emailId',
    'organization',
    'profile',
    'login',
    'register',
    'verify-email',
    'login-verify',
    'forgot-password',
    'reset-password',
  ].map((path): ServerRoute => ({
    path,
    renderMode: RenderMode.Client,
    headers: { 'X-Robots-Tag': 'noindex, nofollow' },
  })),
  {
    path: '**',
    renderMode: RenderMode.Server,
    status: 404,
    headers: { 'X-Robots-Tag': 'noindex, nofollow' },
  },
];
