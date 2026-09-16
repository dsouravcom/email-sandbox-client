import { afterNextRender, Component, ElementRef, inject, input, output, viewChild } from '@angular/core';
import { Mailbox } from '../../../core/mailboxes/mailbox-models';
import { CredentialsView } from '../credentials-view/credentials-view';

/** The "Credentials" dialog — a thin `<dialog>` wrapper around the shared `CredentialsView`. */
@Component({
  selector: 'app-smtp-credentials-panel',
  imports: [CredentialsView],
  templateUrl: './smtp-credentials-panel.html',
})
export class SmtpCredentialsPanel {
  readonly mailbox = input.required<Mailbox>();
  readonly closed = output<void>();

  private readonly dialogRef = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    afterNextRender(() => this.dialogRef().nativeElement.showModal());
  }

  close(): void {
    this.dialogRef().nativeElement.close();
  }

  protected dismiss(): void {
    this.closed.emit();
  }
}
