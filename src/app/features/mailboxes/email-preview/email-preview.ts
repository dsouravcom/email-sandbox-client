import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { firstValueFrom } from 'rxjs';
import { EmailApi } from '../../../core/emails/email-api';
import { EmailAddress, EmailDetail } from '../../../core/emails/email-models';
import { EmailStore } from '../../../core/emails/email-store';
import { getApiErrorMessage } from '../../../core/http/api-error';
import { Mailbox } from '../../../core/mailboxes/mailbox-models';
import { Toast } from '../../../core/notifications/toast';
import { ConfirmDialog } from '../../../shared/ui/confirm-dialog/confirm-dialog';
import { CredentialsView } from '../credentials-view/credentials-view';
import { EmptyState } from '../../../shared/ui/empty-state/empty-state';
import { ErrorState } from '../../../shared/ui/error-state/error-state';
import { SafeEmailHtml } from '../../../shared/ui/safe-email-html/safe-email-html';
import { Skeleton } from '../../../shared/ui/skeleton/skeleton';

type ContentTab = 'html' | 'text';
type DeviceMode = 'desktop' | 'tablet' | 'mobile';

const DEVICE_WIDTH: Record<DeviceMode, string> = {
  desktop: 'max-w-none',
  tablet: 'max-w-[768px]',
  mobile: 'max-w-[390px]',
};

function formatAddress(address: EmailAddress | null | undefined): string {
  if (!address) return '(unknown)';
  return address.name ? `${address.name} <${address.address}>` : address.address;
}

function formatAddresses(addresses: EmailAddress[]): string {
  return addresses.length > 0 ? addresses.map(formatAddress).join(', ') : '(none)';
}

@Component({
  selector: 'app-email-preview',
  imports: [RouterLink, NgIcon, DatePipe, SafeEmailHtml, EmptyState, ErrorState, Skeleton, ConfirmDialog, CredentialsView],
  templateUrl: './email-preview.html',
})
export class EmailPreview {
  private readonly emailApi = inject(EmailApi);
  private readonly emailStore = inject(EmailStore);
  private readonly toast = inject(Toast);

  readonly email = input<EmailDetail | null>(null);
  /** Shown (credentials + code samples) in place of an empty state while no email is selected. */
  readonly mailbox = input<Mailbox | null>(null);
  readonly loading = input(false);
  readonly error = input<string | null>(null);

  readonly retry = output<void>();
  readonly deleted = output<void>();

  protected readonly htmlContent = signal<string | null>(null);
  protected readonly htmlLoading = signal(false);
  protected readonly htmlError = signal<string | null>(null);

  protected readonly contentTab = signal<ContentTab>('html');
  protected readonly deviceMode = signal<DeviceMode>('desktop');
  protected readonly deviceWidthClass = computed(() => DEVICE_WIDTH[this.deviceMode()]);

  private readonly confirmDialog = viewChild.required<ConfirmDialog>('confirmDialog');

  protected readonly formatAddress = formatAddress;
  protected readonly formatAddresses = formatAddresses;

  constructor() {
    effect(() => {
      const detail = this.email();
      if (detail) {
        this.contentTab.set(!detail.hasHtml && detail.hasText ? 'text' : 'html');
      }

      if (detail?.hasHtml) {
        void this.loadHtml(detail.mailboxId, detail.id);
      } else {
        this.htmlContent.set(null);
        this.htmlError.set(null);
      }
    });
  }

  protected async loadHtml(mailboxId?: string, emailId?: string): Promise<void> {
    const detail = this.email();
    const targetMailboxId = mailboxId ?? detail?.mailboxId;
    const targetEmailId = emailId ?? detail?.id;
    if (!targetMailboxId || !targetEmailId) return;

    this.htmlLoading.set(true);
    this.htmlError.set(null);
    try {
      const html = await firstValueFrom(this.emailApi.fetchSandboxedHtml(targetMailboxId, targetEmailId));
      if (this.email()?.id !== targetEmailId) return;
      this.htmlContent.set(html);
    } catch (error) {
      if (this.email()?.id !== targetEmailId) return;
      this.htmlError.set(getApiErrorMessage(error, 'Could not load this email’s content.'));
    } finally {
      this.htmlLoading.set(false);
    }
  }

  protected selectContentTab(tab: ContentTab): void {
    this.contentTab.set(tab);
  }

  protected async toggleRead(): Promise<void> {
    const detail = this.email();
    if (!detail) return;
    try {
      await this.emailStore.setRead(detail.id, !detail.read);
    } catch (error) {
      this.toast.error(getApiErrorMessage(error));
    }
  }

  protected confirmDelete(): void {
    this.confirmDialog().open();
  }

  protected async performDelete(): Promise<void> {
    const detail = this.email();
    if (!detail) return;
    try {
      await this.emailStore.deleteEmail(detail.id);
      this.toast.success('Email deleted.');
      this.deleted.emit();
    } catch (error) {
      this.toast.error(getApiErrorMessage(error));
    }
  }
}
