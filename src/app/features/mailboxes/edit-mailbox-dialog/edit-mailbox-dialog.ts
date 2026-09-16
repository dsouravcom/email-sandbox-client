import { afterNextRender, Component, ElementRef, inject, input, output, signal, viewChild } from '@angular/core';
import { form, FormField, FormRoot, maxLength, required } from '@angular/forms/signals';
import { getApiError, getApiErrorMessage } from '../../../core/http/api-error';
import { MailboxStore } from '../../../core/mailboxes/mailbox-store';
import { Mailbox, MailboxErrorCode } from '../../../core/mailboxes/mailbox-models';
import { Toast } from '../../../core/notifications/toast';
import { FieldError } from '../../../shared/ui/field-error/field-error';

/**
 * Rendered only while the parent's "editing" flag is on, so every open gets
 * a brand new form instance pre-filled from the current mailbox.
 */
@Component({
  selector: 'app-edit-mailbox-dialog',
  imports: [FormRoot, FormField, FieldError],
  templateUrl: './edit-mailbox-dialog.html',
})
export class EditMailboxDialog {
  private readonly mailboxStore = inject(MailboxStore);
  private readonly toast = inject(Toast);

  readonly mailbox = input.required<Mailbox>();
  readonly closed = output<void>();
  readonly updated = output<Mailbox>();

  private readonly dialogRef = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  protected readonly errorMessage = signal<string | null>(null);

  private readonly model = signal({ name: '', description: '', status: 'active' as 'active' | 'paused' });

  protected readonly mailboxForm = form(this.model, (path) => {
    required(path.name, { message: 'Mailbox name is required' });
    maxLength(path.name, 100, { message: 'Name must be at most 100 characters' });
    maxLength(path.description, 500, { message: 'Description must be at most 500 characters' });
  }, {
    submission: {
      action: async (field) => {
        this.errorMessage.set(null);
        const value = field().value();

        try {
          const updated = await this.mailboxStore.updateMailbox(this.mailbox().id, {
            name: value.name,
            description: value.description.trim() ? value.description : null,
            status: value.status,
          });
          this.toast.success(`Mailbox "${updated.name}" updated.`);
          this.updated.emit(updated);
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
    afterNextRender(() => {
      // Required signal inputs aren't readable until after the component has
      // fully constructed — `model` starts blank and is filled in here.
      const mailbox = this.mailbox();
      this.model.set({ name: mailbox.name, description: mailbox.description ?? '', status: mailbox.status });
      this.dialogRef().nativeElement.showModal();
    });
  }

  close(): void {
    this.dialogRef().nativeElement.close();
  }

  protected dismiss(): void {
    this.closed.emit();
  }
}
