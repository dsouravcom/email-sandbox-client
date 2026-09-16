import { afterNextRender, Component, ElementRef, inject, input, output, signal, viewChild } from '@angular/core';
import { form, FormField, FormRoot, maxLength, required } from '@angular/forms/signals';
import { getApiError, getApiErrorMessage } from '../../../core/http/api-error';
import { MailboxStore } from '../../../core/mailboxes/mailbox-store';
import { Mailbox, MailboxErrorCode } from '../../../core/mailboxes/mailbox-models';
import { Toast } from '../../../core/notifications/toast';
import { FieldError } from '../../../shared/ui/field-error/field-error';

/**
 * Rendered only while the parent's "create mailbox" flag is on, so every
 * open gets a brand new form instance instead of needing to hand-reset one.
 */
@Component({
  selector: 'app-create-mailbox-dialog',
  imports: [FormRoot, FormField, FieldError],
  templateUrl: './create-mailbox-dialog.html',
})
export class CreateMailboxDialog {
  private readonly mailboxStore = inject(MailboxStore);
  private readonly toast = inject(Toast);

  readonly organizationId = input.required<string>();
  readonly closed = output<void>();
  readonly created = output<Mailbox>();

  private readonly dialogRef = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  protected readonly errorMessage = signal<string | null>(null);

  protected readonly mailboxForm = form(signal({ name: '', description: '' }), (path) => {
    required(path.name, { message: 'Mailbox name is required' });
    maxLength(path.name, 100, { message: 'Name must be at most 100 characters' });
    maxLength(path.description, 500, { message: 'Description must be at most 500 characters' });
  }, {
    submission: {
      action: async (field) => {
        this.errorMessage.set(null);
        const value = field().value();

        try {
          const mailbox = await this.mailboxStore.createMailbox(this.organizationId(), {
            name: value.name,
            description: value.description.trim() ? value.description : undefined,
          });
          this.toast.success(`Mailbox "${mailbox.name}" created.`);
          this.created.emit(mailbox);
          this.close();
        } catch (error) {
          const apiError = getApiError(error);
          if (apiError?.code === MailboxErrorCode.MAILBOX_NAME_TAKEN) {
            return { kind: 'nameTaken', message: apiError.message, fieldTree: field.name };
          }
          this.errorMessage.set(getApiErrorMessage(error));
        }
        return undefined;
      },
    },
  });

  constructor() {
    afterNextRender(() => this.dialogRef().nativeElement.showModal());
  }

  close(): void {
    this.dialogRef().nativeElement.close();
  }

  /** Fires for every way the native `<dialog>` can close: Cancel, backdrop click, Escape, or a successful create. */
  protected dismiss(): void {
    this.closed.emit();
  }
}
