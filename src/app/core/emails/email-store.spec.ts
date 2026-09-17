import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { EmailApi } from './email-api';
import { EmailStore } from './email-store';
import { EmailDetail, EmailSummary } from './email-models';
import { MailboxEvent } from '../realtime/realtime-models';
import { Realtime } from '../realtime/realtime';

function summary(overrides: Partial<EmailSummary> = {}): EmailSummary {
  return {
    id: 'e1',
    mailboxId: 'm1',
    receivedAt: '2024-01-01T00:00:00.000Z',
    from: { address: 'a@example.com' },
    to: [{ address: 'b@example.com' }],
    subject: 'Subject',
    preview: 'Preview',
    sizeBytes: 100,
    hasAttachments: false,
    attachmentCount: 0,
    hasHtml: false,
    hasText: true,
    status: 'stored',
    read: false,
    ...overrides,
  };
}

describe('EmailStore', () => {
  let store: EmailStore;
  let api: { list: ReturnType<typeof vi.fn>; get: ReturnType<typeof vi.fn>; setRead: ReturnType<typeof vi.fn> };
  let connectedListener: ((event: MailboxEvent) => void) | null;
  let lastConnectedMailboxId: string | null;

  beforeEach(() => {
    connectedListener = null;
    lastConnectedMailboxId = null;

    api = {
      list: vi.fn().mockReturnValue(of({ data: [summary()], nextCursor: 'cursor-1', hasMore: true })),
      get: vi.fn().mockReturnValue(of({ ...summary(), cc: [], bcc: [], replyTo: [], envelopeFrom: null, envelopeRecipients: [], messageId: null, inReplyTo: null, references: null, textBody: 'body', htmlBody: null, htmlUrl: null, headers: {}, parseWarnings: null } as EmailDetail)),
      setRead: vi.fn().mockReturnValue(of(undefined)),
    };

    const fakeRealtime = {
      connectionState: signal('idle').asReadonly(),
      connect: vi.fn((mailboxId: string, onEvent: (event: MailboxEvent) => void) => {
        lastConnectedMailboxId = mailboxId;
        connectedListener = onEvent;
      }),
      disconnect: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: EmailApi, useValue: api },
        { provide: Realtime, useValue: fakeRealtime },
      ],
    });
    store = TestBed.inject(EmailStore);
  });

  it('loads the first page and opens a realtime subscription scoped to the mailbox', async () => {
    await store.openMailbox('m1');

    expect(api.list).toHaveBeenCalledWith('m1', { limit: 50 });
    expect(store.emails()).toHaveLength(1);
    expect(store.hasMore()).toBe(true);
    expect(lastConnectedMailboxId).toBe('m1');
  });

  it('appends deduplicated results on loadMore using the returned cursor', async () => {
    await store.openMailbox('m1');
    api.list.mockReturnValueOnce(of({ data: [summary({ id: 'e1' }), summary({ id: 'e2' })], nextCursor: null, hasMore: false }));

    await store.loadMore();

    expect(api.list).toHaveBeenLastCalledWith('m1', { cursor: 'cursor-1', limit: 50 });
    expect(store.emails().map((e) => e.id)).toEqual(['e1', 'e2']);
    expect(store.hasMore()).toBe(false);
  });

  it('marks an email read optimistically and rolls back if the API call fails', async () => {
    await store.openMailbox('m1');
    api.setRead.mockReturnValueOnce(throwError(() => new Error('network error')));

    await expect(store.setRead('e1', true)).rejects.toThrow();
    expect(store.emails()[0].read).toBe(false); // rolled back
  });

  it('selecting an unread email fetches its detail and marks it read', async () => {
    await store.openMailbox('m1');
    await store.selectEmail('e1');

    expect(api.get).toHaveBeenCalledWith('m1', 'e1');
    expect(api.setRead).toHaveBeenCalledWith('m1', 'e1', { read: true });
    expect(store.emails()[0].read).toBe(true);
    expect(store.selectedEmail()?.id).toBe('e1');
  });

  it('prepends a new email delivered over realtime, without duplicating an already-known one', async () => {
    await store.openMailbox('m1');
    connectedListener!({
      type: 'email.received',
      mailboxId: 'm1',
      organizationId: 'o1',
      email: summary({ id: 'e2', subject: 'New' }),
    });
    connectedListener!({
      type: 'email.received',
      mailboxId: 'm1',
      organizationId: 'o1',
      email: summary({ id: 'e2', subject: 'New' }), // duplicate delivery
    });

    expect(store.emails().map((e) => e.id)).toEqual(['e2', 'e1']);
  });

  it('applies read/unread and deletion events from realtime to the loaded list', async () => {
    await store.openMailbox('m1');

    connectedListener!({ type: 'email.read', mailboxId: 'm1', organizationId: 'o1', emailId: 'e1', readAt: '2024-01-01T00:00:00.000Z' });
    expect(store.emails()[0].read).toBe(true);

    connectedListener!({ type: 'email.unread', mailboxId: 'm1', organizationId: 'o1', emailId: 'e1' });
    expect(store.emails()[0].read).toBe(false);

    connectedListener!({ type: 'email.deleted', mailboxId: 'm1', organizationId: 'o1', emailId: 'e1' });
    expect(store.emails()).toHaveLength(0);
  });

  it('clears the open email if it is deleted by a realtime event', async () => {
    await store.openMailbox('m1');
    await store.selectEmail('e1');

    connectedListener!({ type: 'email.deleted', mailboxId: 'm1', organizationId: 'o1', emailId: 'e1' });

    expect(store.selectedEmailId()).toBeNull();
    expect(store.selectedEmail()).toBeNull();
  });

  it('resyncs the whole list on a bulk-delete event, since it carries no ids', async () => {
    await store.openMailbox('m1');
    api.list.mockClear();
    api.list.mockReturnValueOnce(of({ data: [], nextCursor: null, hasMore: false }));

    connectedListener!({ type: 'emails.bulk_deleted', mailboxId: 'm1', organizationId: 'o1', count: 5 });
    await vi.waitFor(() => expect(api.list).toHaveBeenCalled());

    expect(store.emails()).toHaveLength(0);
  });

  it('ignores an event delivered by a superseded realtime callback after switching mailboxes', async () => {
    await store.openMailbox('m1');
    const staleListener = connectedListener!;

    api.list.mockReturnValueOnce(of({ data: [summary({ id: 'f1', mailboxId: 'm2' })], nextCursor: null, hasMore: false }));
    await store.openMailbox('m2');

    staleListener({ type: 'email.deleted', mailboxId: 'm1', organizationId: 'o1', emailId: 'f1' });

    expect(store.emails().map((e) => e.id)).toEqual(['f1']); // unaffected by the stale event
  });
});
