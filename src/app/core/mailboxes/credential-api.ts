import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../http/api-base-url';
import { CreateCredentialRequest, SmtpCredential } from './mailbox-models';

interface CredentialListResponse {
  data: SmtpCredential[];
}

/**
 * HTTP calls to a mailbox's `/credentials` endpoints. All require the
 * admin/owner role except listing, which any active member can do — though
 * the list response never includes a password, only a `secretHint`.
 */
@Service()
export class CredentialApi {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  list(mailboxId: string): Observable<CredentialListResponse> {
    return this.http.get<CredentialListResponse>(`${this.base}/mailboxes/${mailboxId}/credentials`);
  }

  /** Adds a new active credential alongside any existing ones ("rotate"). Response includes the one-time password. */
  create(mailboxId: string, body: CreateCredentialRequest = {}): Observable<SmtpCredential> {
    return this.http.post<SmtpCredential>(`${this.base}/mailboxes/${mailboxId}/credentials`, body);
  }

  /** Revokes every existing credential and issues exactly one new one. Response includes the one-time password. */
  regenerate(mailboxId: string): Observable<SmtpCredential> {
    return this.http.post<SmtpCredential>(`${this.base}/mailboxes/${mailboxId}/credentials/regenerate`, null);
  }

  /** `force: true` is required to revoke a mailbox's last remaining active credential. */
  revoke(mailboxId: string, credentialId: string, force = false): Observable<void> {
    const params = new HttpParams().set('force', String(force));
    return this.http.delete<void>(`${this.base}/mailboxes/${mailboxId}/credentials/${credentialId}`, { params });
  }
}
