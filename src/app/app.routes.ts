import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth-guard';
import { guestGuard } from './core/auth/guest-guard';

/** Every page is lazy-loaded, so each one ships in its own bundle. */
export const routes: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/app-shell/app-shell').then((m) => m.AppShell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'mailboxes' },
      {
        path: 'mailboxes',
        title: 'Mailboxes · Email Sandbox',
        loadComponent: () => import('./features/mailboxes/mailbox-list/mailbox-list').then((m) => m.MailboxList),
      },
      {
        path: 'mailbox/:mailboxId',
        title: 'Mailbox · Email Sandbox',
        loadComponent: () =>
          import('./features/mailboxes/mailbox-workspace/mailbox-workspace').then((m) => m.MailboxWorkspace),
      },
      {
        path: 'mailbox/:mailboxId/email/:emailId',
        title: 'Mailbox · Email Sandbox',
        loadComponent: () =>
          import('./features/mailboxes/mailbox-workspace/mailbox-workspace').then((m) => m.MailboxWorkspace),
      },
      {
        path: 'organization',
        title: 'Organization settings · Email Sandbox',
        loadComponent: () =>
          import('./features/organization/organization-settings/organization-settings').then(
            (m) => m.OrganizationSettings,
          ),
      },
      {
        path: 'profile',
        title: 'Profile · Email Sandbox',
        loadComponent: () => import('./features/profile/profile/profile').then((m) => m.Profile),
      },
    ],
  },
  {
    // Pages for signed-out visitors, sharing one layout.
    path: '',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/auth-layout/auth-layout').then((m) => m.AuthLayout),
    children: [
      {
        path: 'login',
        title: 'Sign in · Email Sandbox',
        loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
      },
      {
        path: 'register',
        title: 'Create account · Email Sandbox',
        loadComponent: () => import('./features/auth/register/register').then((m) => m.Register),
      },
      {
        path: 'verify-email',
        title: 'Verify email · Email Sandbox',
        loadComponent: () =>
          import('./features/auth/verify-email/verify-email').then((m) => m.VerifyEmail),
      },
      {
        path: 'login-verify',
        title: 'Sign-in code · Email Sandbox',
        loadComponent: () =>
          import('./features/auth/login-verify/login-verify').then((m) => m.LoginVerify),
      },
      {
        path: 'forgot-password',
        title: 'Forgot password · Email Sandbox',
        loadComponent: () =>
          import('./features/auth/forgot-password/forgot-password').then((m) => m.ForgotPassword),
      },
      {
        path: 'reset-password',
        title: 'Reset password · Email Sandbox',
        loadComponent: () =>
          import('./features/auth/reset-password/reset-password').then((m) => m.ResetPassword),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
