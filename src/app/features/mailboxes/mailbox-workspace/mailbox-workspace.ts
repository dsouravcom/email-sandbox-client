import { isPlatformBrowser } from '@angular/common';
import { Component, DestroyRef, effect, inject, input, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { ProvisioningResult } from '../../../core/auth/auth-models';
import { EmailStore } from '../../../core/emails/email-store';
import { MailboxStore } from '../../../core/mailboxes/mailbox-store';
import { EmailList } from '../email-list/email-list';
import { EmailPreview } from '../email-preview/email-preview';

/**
 * The 2-pane (list | preview) mailbox workspace. `mailboxId`/`emailId` come
 * from the route (`withComponentInputBinding`), so navigating between
 * emails within the same mailbox reuses this component instance rather than
 * recreating it — the effects below just react to the new param values.
 *
 * The mailbox name/breadcrumb and the "SMTP credentials" trigger live in
 * `AppShell`'s header (it already reads `MailboxStore.selectedMailbox()`),
 * not here — this component owns only the list/preview pane pair. When no
 * email is selected, `EmailPreview` shows the mailbox's SMTP info itself.
 */
@Component({
  selector: 'app-mailbox-workspace',
  imports: [EmailList, EmailPreview],
  templateUrl: './mailbox-workspace.html',
})
export class MailboxWorkspace {
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  protected readonly mailboxStore = inject(MailboxStore);
  protected readonly emailStore = inject(EmailStore);

  readonly mailboxId = input.required<string>();
  readonly emailId = input<string | undefined>();

  constructor() {
    // One-time: right after email verification, the auto-provisioned
    // mailbox's password is only ever in this navigation's state — a `GET`
    // never includes it — so it's seeded into the store here, the same way
    // the SMTP credentials dialog seeds one it reveals later.
    const provisioning = this.readProvisioningFromHistory();
    if (provisioning) {
      this.mailboxStore.applyRevealedSecret(provisioning.mailbox.id, {
        username: provisioning.mailbox.smtp.username,
        password: provisioning.mailbox.smtp.password,
      });
    }

    effect(() => {
      const mailboxId = this.mailboxId();
      this.mailboxStore.selectMailbox(mailboxId);
      void this.emailStore.openMailbox(mailboxId);
    });

    effect(() => {
      void this.emailStore.selectEmail(this.emailId() ?? null);
    });

    // Navigating away entirely (e.g. to Organization or Profile) doesn't
    // change `mailboxId`, so the effect above never fires to close things —
    // without this, the realtime subscription and selection would leak.
    inject(DestroyRef).onDestroy(() => {
      this.emailStore.closeMailbox();
      this.mailboxStore.selectMailbox(null);
    });
  }

  protected retrySelectedEmail(): void {
    void this.emailStore.selectEmail(this.emailId() ?? null);
  }

  protected onEmailDeleted(): void {
    void this.router.navigate(['/mailbox', this.mailboxId()]);
  }

  private readProvisioningFromHistory(): ProvisioningResult | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    return (history.state?.['provisioning'] as ProvisioningResult | undefined) ?? null;
  }
}
