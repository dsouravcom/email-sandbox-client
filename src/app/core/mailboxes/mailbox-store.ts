import { computed, inject, Service, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { getApiErrorMessage } from '../http/api-error';
import { MailboxApi } from './mailbox-api';
import { CreateMailboxRequest, Mailbox, UpdateMailboxRequest } from './mailbox-models';

interface RevealedSecret {
  username: string;
  password: string;
}

/** The current organization's mailboxes, and which one (if any) is open. */
@Service()
export class MailboxStore {
  private readonly api = inject(MailboxApi);

  private readonly _mailboxes = signal<Mailbox[]>([]);
  private readonly _selectedMailboxId = signal<string | null>(null);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  /**
   * The API only ever returns a mailbox's SMTP password in the single
   * response right after it's created/rotated/regenerated — a plain `GET`
   * never includes it. This keeps the last-known password in memory (never
   * persisted to disk) so it stays visible for the rest of the session
   * instead of disappearing the moment a `GET` (e.g. a realtime
   * `mailbox.updated` refresh) overwrites the mailbox with a passwordless copy.
   */
  private readonly revealedSecrets = new Map<string, RevealedSecret>();

  readonly mailboxes = this._mailboxes.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly selectedMailboxId = this._selectedMailboxId.asReadonly();
  readonly selectedMailbox = computed(
    () => this._mailboxes().find((mailbox) => mailbox.id === this._selectedMailboxId()) ?? null,
  );

  async loadForOrganization(organizationId: string): Promise<void> {
    this._loading.set(true);
    this._error.set(null);
    try {
      const { data } = await firstValueFrom(this.api.listForOrganization(organizationId));
      this._mailboxes.set(data.map((mailbox) => this.withRevealedSecret(mailbox)));
    } catch (error) {
      this._error.set(getApiErrorMessage(error));
    } finally {
      this._loading.set(false);
    }
  }

  selectMailbox(mailboxId: string | null): void {
    this._selectedMailboxId.set(mailboxId);
  }

  /** The response includes a one-time SMTP password — the caller is responsible for showing it. */
  async createMailbox(organizationId: string, request: CreateMailboxRequest): Promise<Mailbox> {
    const mailbox = await firstValueFrom(this.api.create(organizationId, request));
    this.rememberSecret(mailbox);
    this._mailboxes.update((mailboxes) => [...mailboxes, mailbox]);
    return mailbox;
  }

  async updateMailbox(mailboxId: string, request: UpdateMailboxRequest): Promise<Mailbox> {
    const updated = await firstValueFrom(this.api.update(mailboxId, request));
    this.replaceLocally(updated);
    return updated;
  }

  async deleteMailbox(mailboxId: string): Promise<void> {
    await firstValueFrom(this.api.delete(mailboxId));
    this.removeLocally(mailboxId);
  }

  /** Re-fetches one mailbox (e.g. after a realtime `mailbox.updated` event). */
  async refreshMailbox(mailboxId: string): Promise<void> {
    try {
      this.replaceLocally(await firstValueFrom(this.api.get(mailboxId)));
    } catch {
      // Transient failure — the next full list load will correct it.
    }
  }

  /**
   * Records a password revealed outside a create/update call — e.g. from the
   * SMTP credentials dialog adding, rotating, or regenerating a credential —
   * so it keeps showing up wherever this mailbox's SMTP info is displayed.
   */
  applyRevealedSecret(mailboxId: string, secret: RevealedSecret): void {
    this.revealedSecrets.set(mailboxId, secret);
    this._mailboxes.update((mailboxes) =>
      mailboxes.map((mailbox) => (mailbox.id === mailboxId ? this.withRevealedSecret(mailbox) : mailbox)),
    );
  }

  removeLocally(mailboxId: string): void {
    this._mailboxes.update((mailboxes) => mailboxes.filter((mailbox) => mailbox.id !== mailboxId));
    this.revealedSecrets.delete(mailboxId);
    if (this._selectedMailboxId() === mailboxId) {
      this._selectedMailboxId.set(null);
    }
  }

  reset(): void {
    this._mailboxes.set([]);
    this._selectedMailboxId.set(null);
    this._error.set(null);
    this.revealedSecrets.clear();
  }

  private replaceLocally(mailbox: Mailbox): void {
    const merged = this.withRevealedSecret(mailbox);
    this._mailboxes.update((mailboxes) => mailboxes.map((existing) => (existing.id === merged.id ? merged : existing)));
  }

  private rememberSecret(mailbox: Mailbox): void {
    if (mailbox.smtp.password) {
      this.revealedSecrets.set(mailbox.id, { username: mailbox.smtp.username, password: mailbox.smtp.password });
    }
  }

  private withRevealedSecret(mailbox: Mailbox): Mailbox {
    if (mailbox.smtp.password) {
      this.revealedSecrets.set(mailbox.id, { username: mailbox.smtp.username, password: mailbox.smtp.password });
      return mailbox;
    }
    const secret = this.revealedSecrets.get(mailbox.id);
    return secret ? { ...mailbox, smtp: { ...mailbox.smtp, ...secret } } : mailbox;
  }
}
