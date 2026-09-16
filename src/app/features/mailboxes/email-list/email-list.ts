import { Component, computed, input, output, signal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { EmailSummary } from '../../../core/emails/email-models';
import { EmptyState } from '../../../shared/ui/empty-state/empty-state';
import { ErrorState } from '../../../shared/ui/error-state/error-state';
import { Skeleton } from '../../../shared/ui/skeleton/skeleton';
import { EmailListItem } from '../email-list-item/email-list-item';

const LOAD_MORE_THRESHOLD_PX = 200;

@Component({
  selector: 'app-email-list',
  imports: [EmailListItem, EmptyState, ErrorState, Skeleton, NgIcon],
  templateUrl: './email-list.html',
})
export class EmailList {
  readonly mailboxId = input.required<string>();
  readonly emails = input.required<EmailSummary[]>();
  readonly selectedEmailId = input<string | null>(null);
  readonly loading = input(false);
  readonly loadingMore = input(false);
  readonly hasMore = input(false);
  readonly error = input<string | null>(null);

  readonly loadMore = output<void>();
  readonly retry = output<void>();

  protected readonly searchQuery = signal('');

  /**
   * Filters only what's already loaded — the API has no free-text search
   * endpoint (just an `unread` flag), so a match doesn't mean the mailbox
   * has nothing else; it means nothing else *loaded so far* matches.
   */
  protected readonly filteredEmails = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) return this.emails();
    return this.emails().filter((email) => {
      const haystack = [email.subject, email.preview, email.from?.address, email.from?.name]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  });

  protected onScroll(event: Event): void {
    if (!this.hasMore() || this.loadingMore()) return;
    const el = event.target as HTMLElement;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - LOAD_MORE_THRESHOLD_PX) {
      this.loadMore.emit();
    }
  }
}
