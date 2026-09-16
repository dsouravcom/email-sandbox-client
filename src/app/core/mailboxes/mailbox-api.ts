import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../http/api-base-url';
import { CreateMailboxRequest, Mailbox, UpdateMailboxRequest } from './mailbox-models';

interface MailboxListResponse {
  data: Mailbox[];
}

/** HTTP calls to the `/organizations/:id/mailboxes` and `/mailboxes/:id` endpoints. */
@Service()
export class MailboxApi {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  /** All mailboxes in an organization, visible to any active member. */
  listForOrganization(organizationId: string): Observable<MailboxListResponse> {
    return this.http.get<MailboxListResponse>(`${this.base}/organizations/${organizationId}/mailboxes`);
  }

  /** Requires the admin/owner role. The response includes a one-time SMTP password. */
  create(organizationId: string, body: CreateMailboxRequest): Observable<Mailbox> {
    return this.http.post<Mailbox>(`${this.base}/organizations/${organizationId}/mailboxes`, body);
  }

  get(mailboxId: string): Observable<Mailbox> {
    return this.http.get<Mailbox>(`${this.base}/mailboxes/${mailboxId}`);
  }

  /** Requires the admin/owner role. */
  update(mailboxId: string, body: UpdateMailboxRequest): Observable<Mailbox> {
    return this.http.patch<Mailbox>(`${this.base}/mailboxes/${mailboxId}`, body);
  }

  /** Requires the admin/owner role. Soft delete. */
  delete(mailboxId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/mailboxes/${mailboxId}`);
  }
}
