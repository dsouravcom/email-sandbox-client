import { Component, inject, signal, viewChild } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { getApiErrorMessage } from '../../../core/http/api-error';
import { Mailbox } from '../../../core/mailboxes/mailbox-models';
import { MailboxStore } from '../../../core/mailboxes/mailbox-store';
import { OrganizationStore } from '../../../core/organizations/organization-store';
import { Toast } from '../../../core/notifications/toast';
import { ConfirmDialog } from '../../../shared/ui/confirm-dialog/confirm-dialog';
import { EmptyState } from '../../../shared/ui/empty-state/empty-state';
import { ErrorState } from '../../../shared/ui/error-state/error-state';
import { Skeleton } from '../../../shared/ui/skeleton/skeleton';
import { CreateMailboxDialog } from '../create-mailbox-dialog/create-mailbox-dialog';
import { EditMailboxDialog } from '../edit-mailbox-dialog/edit-mailbox-dialog';
import { MailboxCard } from '../mailbox-card/mailbox-card';

@Component({
  selector: 'app-mailbox-list',
  imports: [NgIcon, MailboxCard, CreateMailboxDialog, EditMailboxDialog, ConfirmDialog, EmptyState, ErrorState, Skeleton],
  templateUrl: './mailbox-list.html',
})
export class MailboxList {
  private readonly toast = inject(Toast);
  protected readonly organizationStore = inject(OrganizationStore);
  protected readonly mailboxStore = inject(MailboxStore);

  protected readonly showCreateDialog = signal(false);
  protected readonly editingMailbox = signal<Mailbox | null>(null);
  protected readonly deletingMailbox = signal<Mailbox | null>(null);
  protected readonly deleting = signal(false);

  private readonly deleteDialog = viewChild.required(ConfirmDialog);

  protected retryLoad(): void {
    const organizationId = this.organizationStore.currentOrganizationId();
    if (organizationId) {
      void this.mailboxStore.loadForOrganization(organizationId);
    }
  }

  protected requestDelete(mailbox: Mailbox): void {
    this.deletingMailbox.set(mailbox);
    this.deleteDialog().open();
  }

  protected async confirmDelete(): Promise<void> {
    const mailbox = this.deletingMailbox();
    if (!mailbox) return;
    this.deleting.set(true);
    try {
      await this.mailboxStore.deleteMailbox(mailbox.id);
      this.toast.success(`Mailbox "${mailbox.name}" deleted.`);
    } catch (error) {
      this.toast.error(getApiErrorMessage(error));
    } finally {
      this.deleting.set(false);
      this.deletingMailbox.set(null);
    }
  }
}
