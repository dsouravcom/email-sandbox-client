/** A parsed email address; `name` is the display name, when the message had one. */
export interface EmailAddress {
  address: string;
  name?: string | null;
}

/**
 * A row in an email list, and the payload of the realtime `email.received`
 * event. Mirrors the API's `emailSummarySchema` — notably it DOES include a
 * short text `preview`, but never the full body/headers/recipients, which
 * only `EmailDetail` has.
 */
export interface EmailSummary {
  id: string;
  mailboxId: string;
  receivedAt: string;
  from: EmailAddress | null;
  /** Capped at 10 addresses by the API. */
  to: EmailAddress[];
  subject: string | null;
  preview: string | null;
  sizeBytes: number;
  hasAttachments: boolean;
  attachmentCount: number;
  hasHtml: boolean;
  hasText: boolean;
  status: 'stored' | 'partial' | 'failed';
  read: boolean;
}

/** Mirrors the API's `emailDetailSchema` (`emailSummarySchema` plus full content). */
export interface EmailDetail extends EmailSummary {
  /** Capped at 10 addresses each, like `to`. */
  cc: EmailAddress[];
  bcc: EmailAddress[];
  replyTo: EmailAddress[];
  envelopeFrom: string | null;
  envelopeRecipients: string[];
  messageId: string | null;
  inReplyTo: string | null;
  references: string[] | null;
  textBody: string | null;
  /** Raw, UNSANITIZED HTML straight from the message — never bind with [innerHTML]. */
  htmlBody: string | null;
  /** Relative path to the sandboxed HTML render endpoint; requires the Bearer token like any other API call. */
  htmlUrl: string | null;
  headers: Record<string, string[]>;
  parseWarnings: string[] | null;
}

/** `GET /mailboxes/:id/emails` query params. */
export interface EmailListQuery {
  cursor?: string;
  limit?: number;
  unread?: boolean;
}

/** `PATCH /mailboxes/:id/emails/:emailId` body. */
export interface MarkReadRequest {
  read: boolean;
}

/** `POST /mailboxes/:id/emails/bulk-delete` body — 1 to 500 ids. */
export interface BulkDeleteRequest {
  ids: string[];
}

/** Error codes the API uses for cases the UI handles specially. */
export const EmailErrorCode = {
  EMAIL_NOT_FOUND: 'EMAIL_NOT_FOUND',
  INVALID_CURSOR: 'INVALID_CURSOR',
} as const;
