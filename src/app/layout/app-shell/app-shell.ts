import { Component, computed, DestroyRef, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { filter, map } from 'rxjs';
import { EmailStore } from '../../core/emails/email-store';
import { MailboxStore } from '../../core/mailboxes/mailbox-store';
import { OrganizationStore } from '../../core/organizations/organization-store';
import { SmtpCredentialsPanel } from '../../features/mailboxes/smtp-credentials-panel/smtp-credentials-panel';
import { ToastContainer } from '../../shared/ui/toast-container/toast-container';
import { OrganizationSwitcher } from '../organization-switcher/organization-switcher';
import { Sidebar } from '../sidebar/sidebar';

/**
 * The authenticated app's shell: sidebar, one top bar (organization switcher,
 * and — while a mailbox is open — a breadcrumb and the "SMTP credentials"
 * trigger), and the routed page. Owns the top-level "org changed" reaction —
 * switching organizations resets and reloads every org-scoped store — and
 * clears all of them when the shell is torn down (logout, or a failed token
 * refresh redirecting to `/login`), so no tenant's data survives into the
 * next signed-in session on the same tab.
 */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, Sidebar, OrganizationSwitcher, ToastContainer, NgIcon, SmtpCredentialsPanel],
  templateUrl: './app-shell.html',
})
export class AppShell {
  private readonly organizationStore = inject(OrganizationStore);
  private readonly mailboxStore = inject(MailboxStore);
  private readonly emailStore = inject(EmailStore);
  private readonly router = inject(Router);

  protected readonly showSmtpDialog = signal(false);

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  /** Only show the mailbox breadcrumb/SMTP button while actually on a mailbox workspace route. */
  protected readonly openMailbox = computed(() =>
    this.currentUrl().startsWith('/mailbox/') ? this.mailboxStore.selectedMailbox() : null,
  );

  /** The title of the currently selected email when viewing an email within a mailbox. */
  protected readonly currentEmailTitle = computed(() => {
    if (!this.currentUrl().startsWith('/mailbox/')) return null;
    const detail = this.emailStore.selectedEmail();
    if (detail) return detail.subject || '(no subject)';
    const selectedId = this.emailStore.selectedEmailId();
    if (!selectedId) return null;
    const summary = this.emailStore.emails().find((e) => e.id === selectedId);
    return summary ? (summary.subject || '(no subject)') : 'Email';
  });

  constructor() {
    void this.organizationStore.loadOrganizations();

    // On a deep link straight into a mailbox route, that mailbox's own
    // effect opens it (and fetches its emails) before this async org load
    // resolves — so resetting/closing on that *first* resolution (null to a
    // real id) would wipe it out with nothing left to reopen it. Only a
    // genuine org *switch* (one real id to a different real id) should
    // reset anything.
    let previousOrganizationId: string | null = null;
    effect(() => {
      const organizationId = this.organizationStore.currentOrganizationId();
      if (organizationId === previousOrganizationId) return;
      const isRealSwitch = previousOrganizationId !== null && organizationId !== null;
      previousOrganizationId = organizationId;

      if (isRealSwitch) {
        this.emailStore.closeMailbox();
        this.mailboxStore.reset();
      }
      if (organizationId) {
        void this.mailboxStore.loadForOrganization(organizationId);
      }
    });

    inject(DestroyRef).onDestroy(() => {
      this.emailStore.closeMailbox();
      this.mailboxStore.reset();
      this.organizationStore.reset();
    });
  }
}
