/**
 * A mailbox's SMTP connection info. `password` is only ever populated in the
 * single response right after creation, credential rotation, or credential
 * regeneration — a later fetch never includes it again.
 */
export interface MailboxSmtpInfo {
  host: string;
  port: number;
  secure: false;
  username: string;
  password?: string;
}

/**
 * Bounded, best-effort counts (never an unbounded `count(*)`). Once a count
 * hits the server's scan window, its `*Capped` flag is true and the UI
 * should render it as e.g. "999+" rather than an exact number. Absent while
 * the mailbox's stats haven't been requested/computed.
 */
export interface MailboxStats {
  totalCount: number;
  totalCapped: boolean;
  unreadCount: number;
  unreadCapped: boolean;
  lastReceivedAt: string | null;
}

/** Mirrors the API's `mailboxResponseSchema`; dates arrive as ISO strings. */
export interface Mailbox {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  status: 'active' | 'paused';
  /** `null` means "inherit the organization's retention policy". */
  retentionDays: number | null;
  messageLimit: number | null;
  createdAt: string;
  updatedAt: string;
  smtp: MailboxSmtpInfo;
  stats?: MailboxStats;
}

/** `POST /organizations/:id/mailboxes` body. */
export interface CreateMailboxRequest {
  name: string;
  description?: string;
}

/** `PATCH /mailboxes/:id` body — at least one field is required. */
export interface UpdateMailboxRequest {
  name?: string;
  description?: string | null;
  status?: 'active' | 'paused';
  retentionDays?: number | null;
  messageLimit?: number | null;
}

/**
 * Mirrors the API's `credentialResponseSchema`. `password` is only present
 * on the response to creating/rotating/regenerating a credential — it is
 * never retrievable afterward, only `secretHint` (its last 4 characters).
 */
export interface SmtpCredential {
  id: string;
  username: string;
  secretHint: string;
  label: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  revokedAt: string | null;
  password?: string;
}

/** `POST /mailboxes/:id/credentials` body. */
export interface CreateCredentialRequest {
  label?: string;
}

/** Error codes the API uses for cases the UI handles specially. */
export const MailboxErrorCode = {
  MAILBOX_NOT_FOUND: 'MAILBOX_NOT_FOUND',
  MAILBOX_NAME_TAKEN: 'MAILBOX_NAME_TAKEN',
  MAILBOX_LIMIT_REACHED: 'MAILBOX_LIMIT_REACHED',
  MAILBOX_FORBIDDEN: 'MAILBOX_FORBIDDEN',
} as const;

export const CredentialErrorCode = {
  CREDENTIAL_NOT_FOUND: 'CREDENTIAL_NOT_FOUND',
  CREDENTIAL_LAST_ACTIVE: 'CREDENTIAL_LAST_ACTIVE',
} as const;
