import { Component, input, signal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';

const FEEDBACK_DURATION_MS = 1500;

/** Copies a value to the clipboard with brief "Copied" feedback — used throughout the SMTP credentials panel. */
@Component({
  selector: 'app-copy-button',
  imports: [NgIcon],
  template: `
    <button type="button" class="btn btn-ghost btn-xs gap-1" (click)="copy()" [attr.aria-label]="'Copy ' + label()">
      <ng-icon [name]="copied() ? 'lucideCheck' : 'lucideCopy'" size="14" />
      {{ copied() ? 'Copied' : 'Copy' }}
    </button>
  `,
})
export class CopyButton {
  readonly value = input.required<string>();
  readonly label = input('value');

  protected readonly copied = signal(false);

  protected async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.value());
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), FEEDBACK_DURATION_MS);
    } catch {
      // Clipboard API unavailable (e.g. insecure context) — the value stays visible to select manually.
    }
  }
}
