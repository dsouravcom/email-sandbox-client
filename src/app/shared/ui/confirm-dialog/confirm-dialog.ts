import { Component, ElementRef, input, output, viewChild } from '@angular/core';

/** A daisyUI `<dialog>` modal for confirming a destructive or hard-to-reverse action. */
@Component({
  selector: 'app-confirm-dialog',
  imports: [],
  templateUrl: './confirm-dialog.html',
})
export class ConfirmDialog {
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly confirmLabel = input('Confirm');
  /** Styles the confirm button as destructive (red) rather than the primary brand color. */
  readonly danger = input(false);
  readonly confirmed = output<void>();

  private readonly dialogRef = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  open(): void {
    this.dialogRef().nativeElement.showModal();
  }

  close(): void {
    this.dialogRef().nativeElement.close();
  }

  confirm(): void {
    this.confirmed.emit();
    this.close();
  }
}
