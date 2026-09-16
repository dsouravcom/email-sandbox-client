/** The caller's role in an organization, least to most privileged. */
export type OrganizationRole = 'viewer' | 'member' | 'admin' | 'owner';

/** Mirrors the API's `organizationResponseSchema`; dates arrive as ISO strings. */
export interface Organization {
  id: string;
  name: string;
  slug: string | null;
  isPersonal: boolean;
  plan: 'free' | 'pro' | 'enterprise';
  retentionDays: number;
  maxMailboxes: number;
  maxMessagesPerMailbox: number;
  /** The signed-in user's own role in this organization. */
  role: OrganizationRole;
  createdAt: string;
}

/** `PATCH /organizations/:id` body — at least one field is required. */
export interface UpdateOrganizationRequest {
  name?: string;
  retentionDays?: number;
}

/** Error codes the API uses for cases the UI handles specially. */
export const OrganizationErrorCode = {
  ORGANIZATION_NOT_FOUND: 'ORGANIZATION_NOT_FOUND',
  ORGANIZATION_FORBIDDEN: 'ORGANIZATION_FORBIDDEN',
} as const;
