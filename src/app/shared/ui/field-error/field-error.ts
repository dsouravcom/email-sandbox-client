import { Component, computed, input } from '@angular/core';
import type { FieldTree } from '@angular/forms/signals';

/** Shows a field's first validation error once the user has interacted with it. */
@Component({
  selector: 'app-field-error',
  template: `
    @if (message(); as text) {
      <p class="mt-1 text-sm text-error" role="alert">{{ text }}</p>
    }
  `,
})
export class FieldError {
  readonly field = input.required<FieldTree<unknown>>();

  protected readonly message = computed(() => {
    const state = this.field()();
    if (!state.touched() || !state.invalid()) {
      return null;
    }
    return state.errors()[0]?.message ?? 'This value is invalid';
  });
}
