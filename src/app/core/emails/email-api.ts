import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';
import { CursorPage } from '../pagination/pagination-models';
import { API_BASE_URL } from '../http/api-base-url';
import { triggerBlobDownload } from '../../shared/utils/download';
import { BulkDeleteRequest, EmailAttachment, EmailDetail, EmailListQuery, EmailSummary, MarkReadRequest } from './email-models';

interface ReadAllResponse {
  updatedCount: number;
  hasMore: boolean;
}

interface BulkDeleteResponse {
  deletedCount: number;
}

interface DeleteAllResponse {
  message: string;
}

/** HTTP calls to a mailbox's `/emails` endpoints, including cursor-paginated listing. */
@Service()
export class EmailApi {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  list(mailboxId: string, query: EmailListQuery = {}): Observable<CursorPage<EmailSummary>> {
    let params = new HttpParams();
    if (query.cursor) params = params.set('cursor', query.cursor);
    if (query.limit) params = params.set('limit', query.limit);
    if (query.unread !== undefined) params = params.set('unread', String(query.unread));
    return this.http.get<CursorPage<EmailSummary>>(`${this.base}/mailboxes/${mailboxId}/emails`, { params });
  }

  get(mailboxId: string, emailId: string): Observable<EmailDetail> {
    return this.http.get<EmailDetail>(`${this.base}/mailboxes/${mailboxId}/emails/${emailId}`);
  }

  setRead(mailboxId: string, emailId: string, body: MarkReadRequest): Observable<void> {
    return this.http.patch<void>(`${this.base}/mailboxes/${mailboxId}/emails/${emailId}`, body);
  }

  delete(mailboxId: string, emailId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/mailboxes/${mailboxId}/emails/${emailId}`);
  }

  /** Up to 500 ids per call. */
  bulkDelete(mailboxId: string, body: BulkDeleteRequest): Observable<BulkDeleteResponse> {
    return this.http.post<BulkDeleteResponse>(`${this.base}/mailboxes/${mailboxId}/emails/bulk-delete`, body);
  }

  /** Marks up to 5000 emails read per call; call again while `hasMore` is true. */
  readAll(mailboxId: string): Observable<ReadAllResponse> {
    return this.http.post<ReadAllResponse>(`${this.base}/mailboxes/${mailboxId}/emails/read-all`, null);
  }

  /** Requires the admin/owner role. Queues an unbounded, asynchronous delete of every email in the mailbox. */
  deleteAll(mailboxId: string): Observable<DeleteAllResponse> {
    return this.http.delete<DeleteAllResponse>(`${this.base}/mailboxes/${mailboxId}/emails`);
  }

  /**
   * Fetches the API's pre-sanitized-headers HTML render of an email, for
   * safe iframe display. This is a normal Bearer-authenticated GET — there is
   * no public/token-based URL, so it cannot be used directly as an
   * `<iframe src>` and must be loaded here and shown via `srcdoc` instead.
   */
  fetchSandboxedHtml(mailboxId: string, emailId: string): Observable<string> {
    return this.http.get(`${this.base}/mailboxes/${mailboxId}/emails/${emailId}/html`, { responseType: 'text' });
  }

  /** The raw `.eml` source as text, for inline display (e.g. a "Raw" tab) rather than triggering a download. */
  fetchRawText(mailboxId: string, emailId: string): Observable<string> {
    return this.http.get(`${this.base}/mailboxes/${mailboxId}/emails/${emailId}/raw`, { responseType: 'text' });
  }

  /** Downloads the message's raw `.eml` file. Also Bearer-authenticated, so this fetches a blob rather than navigating to the URL. */
  async downloadRaw(mailboxId: string, emailId: string): Promise<void> {
    const blob = await firstValueFrom(
      this.http.get(`${this.base}/mailboxes/${mailboxId}/emails/${emailId}/raw`, { responseType: 'blob' }),
    );
    triggerBlobDownload(blob, `email-${emailId}.eml`);
  }

  async downloadAttachment(mailboxId: string, emailId: string, attachment: EmailAttachment): Promise<void> {
    const blob = await firstValueFrom(
      this.http.get(`${this.base}/mailboxes/${mailboxId}/emails/${emailId}/attachments/${attachment.id}/download`, {
        responseType: 'blob',
      }),
    );
    triggerBlobDownload(blob, attachment.filename ?? attachment.id);
  }
}
