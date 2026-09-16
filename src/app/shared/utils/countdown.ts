import { DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription, take, timer } from 'rxjs';

/**
 * A countdown in seconds exposed as a signal, e.g. to rate-limit a "Resend
 * code" button. Create it in an injection context (such as a field
 * initializer); the timer stops when the owning component is destroyed.
 */
export function createCountdown(seconds: number) {
  const destroyRef = inject(DestroyRef);
  const remaining = signal(0);
  let subscription: Subscription | undefined;

  return {
    remaining: remaining.asReadonly(),
    start(): void {
      subscription?.unsubscribe();
      subscription = timer(0, 1000)
        .pipe(take(seconds + 1), takeUntilDestroyed(destroyRef))
        .subscribe((elapsed) => remaining.set(seconds - elapsed));
    },
  };
}
