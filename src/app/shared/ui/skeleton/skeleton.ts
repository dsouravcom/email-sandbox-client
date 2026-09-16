import { Component, computed, input } from '@angular/core';

const ROW_WIDTHS = [92, 78, 62, 88, 70];

/** A row of pulsing placeholder bars, preferred over a full-page spinner for lists and previews. */
@Component({
  selector: 'app-skeleton',
  imports: [],
  template: `
    <div class="animate-pulse space-y-3 p-4" role="status" [attr.aria-label]="label()">
      @for (width of rows(); track $index) {
        <div class="h-3 rounded bg-surface-raised" [style.width.%]="width"></div>
      }
    </div>
  `,
})
export class Skeleton {
  readonly lines = input(3);
  readonly label = input('Loading');

  protected readonly rows = computed(() =>
    Array.from({ length: this.lines() }, (_, index) => ROW_WIDTHS[index % ROW_WIDTHS.length]),
  );
}
