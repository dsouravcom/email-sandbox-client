import { Component, input } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { IconName } from '../../../core/icons';

/** A meaningful empty state: an icon, a title, and actionable guidance — never just "No data." */
@Component({
  selector: 'app-empty-state',
  imports: [NgIcon],
  template: `
    <div class="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <div class="rounded-full bg-surface-raised p-3 text-ink/40">
        <ng-icon [name]="icon()" size="28" />
      </div>
      <div class="space-y-1">
        <p class="font-medium text-ink">{{ title() }}</p>
        @if (description()) {
          <p class="max-w-sm text-sm text-ink/60">{{ description() }}</p>
        }
      </div>
      <ng-content />
    </div>
  `,
})
export class EmptyState {
  readonly icon = input.required<IconName>();
  readonly title = input.required<string>();
  readonly description = input('');
}
