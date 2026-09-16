import { inject, Service, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { getApiErrorMessage } from '../http/api-error';
import { MailboxEvent } from '../realtime/realtime-models';
import { Realtime } from '../realtime/realtime';
import { EmailApi } from './email-api';
import { EmailDetail, EmailSummary } from './email-models';

const PAGE_SIZE = 50;

/**
 * The email list and open email for whichever mailbox is currently open,
 * kept live via a realtime subscription. Only one mailbox is open at a time,
 * matching the app's single-pane-pair mailbox workspace.
 */
@Service()
export class EmailStore {
  private readonly api = inject(EmailApi);
  private readonly realtime = inject(Realtime);

  private mailboxId: string | null = null;

  private readonly _emails = signal<EmailSummary[]>([]);
  private readonly _nextCursor = signal<string | null>(null);
  private readonly _hasMore = signal(false);
  private readonly _loading = signal(false);
  private readonly _loadingMore = signal(false);
  private readonly _error = signal<string | null>(null);

  private readonly _selectedEmailId = signal<string | null>(null);
  private readonly _selectedEmail = signal<EmailDetail | null>(null);
  private readonly _selectedEmailLoading = signal(false);
  private readonly _selectedEmailError = signal<string | null>(null);

  /** Events this store doesn't own (mailbox/credential changes) for other stores/components to react to. */
  readonly lastMailboxEvent = signal<MailboxEvent | null>(null);
  readonly connectionState = this.realtime.connectionState;

  readonly emails = this._emails.asReadonly();
  readonly hasMore = this._hasMore.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly loadingMore = this._loadingMore.asReadonly();
  readonly error = this._error.asReadonly();
  readonly selectedEmailId = this._selectedEmailId.asReadonly();
  readonly selectedEmail = this._selectedEmail.asReadonly();
  readonly selectedEmailLoading = this._selectedEmailLoading.asReadonly();
  readonly selectedEmailError = this._selectedEmailError.asReadonly();

  /** Loads the first page for a mailbox and opens its realtime subscription. No-op if it's already open. */
  async openMailbox(mailboxId: string): Promise<void> {
    if (this.mailboxId === mailboxId) return;
    this.realtime.disconnect();
    this.mailboxId = mailboxId;
    this._emails.set([]);
    this._nextCursor.set(null);
    this._hasMore.set(false);
    this._selectedEmailId.set(null);
    this._selectedEmail.set(null);
    this._selectedEmailError.set(null);
    this.lastMailboxEvent.set(null);

    await this.loadFirstPage();
    this.realtime.connect(mailboxId, (event) => this.handleEvent(mailboxId, event));
  }

  closeMailbox(): void {
    this.realtime.disconnect();
    this.mailboxId = null;
    this._emails.set([]);
    this._nextCursor.set(null);
    this._hasMore.set(false);
    this._selectedEmailId.set(null);
    this._selectedEmail.set(null);
  }

  async loadFirstPage(): Promise<void> {
    const mailboxId = this.mailboxId;
    if (!mailboxId) return;
    this._loading.set(true);
    this._error.set(null);
    try {
      const page = await firstValueFrom(this.api.list(mailboxId, { limit: PAGE_SIZE }));
      if (this.mailboxId !== mailboxId) return;
      this._emails.set(page.data);
      this._nextCursor.set(page.nextCursor);
      this._hasMore.set(page.hasMore);
    } catch (error) {
      this._error.set(getApiErrorMessage(error));
    } finally {
      this._loading.set(false);
    }
  }

  async loadMore(): Promise<void> {
    const mailboxId = this.mailboxId;
    const cursor = this._nextCursor();
    if (!mailboxId || !cursor || this._loadingMore()) return;
    this._loadingMore.set(true);
    try {
      const page = await firstValueFrom(this.api.list(mailboxId, { cursor, limit: PAGE_SIZE }));
      if (this.mailboxId !== mailboxId) return;
      const knownIds = new Set(this._emails().map((email) => email.id));
      this._emails.update((existing) => [...existing, ...page.data.filter((email) => !knownIds.has(email.id))]);
      this._nextCursor.set(page.nextCursor);
      this._hasMore.set(page.hasMore);
    } catch (error) {
      this._error.set(getApiErrorMessage(error));
    } finally {
      this._loadingMore.set(false);
    }
  }

  /** Selects an email, fetches its full detail, and marks it read (optimistically, rolled back on failure). */
  async selectEmail(emailId: string | null): Promise<void> {
    this._selectedEmailId.set(emailId);
    this._selectedEmail.set(null);
    this._selectedEmailError.set(null);
    if (!emailId) return;
    const mailboxId = this.mailboxId;
    if (!mailboxId) return;

    this._selectedEmailLoading.set(true);
    try {
      const detail = await firstValueFrom(this.api.get(mailboxId, emailId));
      if (this._selectedEmailId() !== emailId) return;
      this._selectedEmail.set(detail);
      if (!detail.read) {
        this.applyReadState(emailId, true);
        firstValueFrom(this.api.setRead(mailboxId, emailId, { read: true })).catch(() => {
          this.applyReadState(emailId, false);
        });
      }
    } catch (error) {
      this._selectedEmailError.set(getApiErrorMessage(error));
    } finally {
      this._selectedEmailLoading.set(false);
    }
  }

  async setRead(emailId: string, read: boolean): Promise<void> {
    const mailboxId = this.mailboxId;
    if (!mailboxId) return;
    const previous = this._emails().find((email) => email.id === emailId)?.read ?? !read;
    this.applyReadState(emailId, read);
    try {
      await firstValueFrom(this.api.setRead(mailboxId, emailId, { read }));
    } catch (error) {
      this.applyReadState(emailId, previous);
      throw error;
    }
  }

  async deleteEmail(emailId: string): Promise<void> {
    const mailboxId = this.mailboxId;
    if (!mailboxId) return;
    await firstValueFrom(this.api.delete(mailboxId, emailId));
    this.removeLocally(emailId);
  }

  /** Marks every email in the mailbox read, in the API's own batches, resolving once the server reports none left. */
  async markAllRead(): Promise<void> {
    const mailboxId = this.mailboxId;
    if (!mailboxId) return;
    this._emails.update((emails) => emails.map((email) => ({ ...email, read: true })));
    let hasMore = true;
    while (hasMore) {
      hasMore = (await firstValueFrom(this.api.readAll(mailboxId))).hasMore;
    }
  }

  private handleEvent(mailboxId: string, event: MailboxEvent): void {
    if (this.mailboxId !== mailboxId) return;

    switch (event.type) {
      case 'email.received':
        this._emails.update((emails) =>
          emails.some((email) => email.id === event.email.id) ? emails : [event.email, ...emails],
        );
        break;
      case 'email.read':
        this.applyReadState(event.emailId, true);
        break;
      case 'email.unread':
        this.applyReadState(event.emailId, false);
        break;
      case 'email.deleted':
        this.removeLocally(event.emailId);
        break;
      case 'emails.bulk_deleted':
        // The event carries a count but not which ids — resync instead of guessing.
        void this.loadFirstPage();
        break;
      default:
        this.lastMailboxEvent.set(event);
    }
  }

  private applyReadState(emailId: string, read: boolean): void {
    this._emails.update((emails) => emails.map((email) => (email.id === emailId ? { ...email, read } : email)));
    this._selectedEmail.update((detail) => (detail?.id === emailId ? { ...detail, read } : detail));
  }

  private removeLocally(emailId: string): void {
    this._emails.update((emails) => emails.filter((email) => email.id !== emailId));
    if (this._selectedEmailId() === emailId) {
      this._selectedEmailId.set(null);
      this._selectedEmail.set(null);
    }
  }
}
