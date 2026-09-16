import { EmailSummary } from '../emails/email-models';

/**
 * The exact union of events the `GET /mailboxes/:id/events` SSE stream can
 * push, mirroring the API's `MailboxEvent` type. The SSE `event:` frame name
 * always equals `type`, and `data:` is this object JSON-stringified.
 */
export type MailboxEvent =
  | { type: 'email.received'; mailboxId: string; organizationId: string; email: EmailSummary }
  | { type: 'email.read'; mailboxId: string; organizationId: string; emailId: string; readAt: string }
  | { type: 'email.unread'; mailboxId: string; organizationId: string; emailId: string }
  | { type: 'email.deleted'; mailboxId: string; organizationId: string; emailId: string }
  | { type: 'emails.bulk_deleted'; mailboxId: string; organizationId: string; count: number }
  | { type: 'mailbox.updated'; mailboxId: string; organizationId: string }
  | { type: 'mailbox.deleted'; mailboxId: string; organizationId: string }
  | { type: 'credential.revoked'; mailboxId: string; organizationId: string };

/** The connection lifecycle of a single mailbox's realtime subscription. */
export type RealtimeConnectionState = 'idle' | 'connecting' | 'open' | 'reconnecting' | 'closed' | 'error';
