import { Component, input, output } from '@angular/core';
import { NgIcon } from '@ng-icons/core';

/** A recoverable-error placeholder — never the raw backend/DB error message, always a "Try again" path. */
@Component({
  selector: 'app-error-state',
  imports: [NgIcon],
  template: `
    <div class="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <ng-icon name="lucideCircleAlert" size="28" class="text-error" />
      <p class="max-w-sm text-sm text-ink/70" role="alert">{{ message() }}</p>
      @if (retryable()) {
        <button type="button" class="btn btn-outline btn-sm" (click)="retry.emit()">Try again</button>
      }
    </div>
  `,
})
export class ErrorState {
  readonly message = input.required<string>();
  readonly retryable = input(true);
  readonly retry = output<void>();
}
