import { computed, inject, Service } from '@angular/core';
import { AuthStore } from '../auth/auth-store';
import { DEFAULT_PREFERENCES } from './account-api';

@Service()
export class AccountPreferencesStore {
  private readonly auth = inject(AuthStore);
  readonly value = computed(() => this.auth.user()?.preferences ?? DEFAULT_PREFERENCES);
  readonly timezone = computed(() =>
    this.value().timestampTimezone === 'UTC' ? 'UTC' : undefined,
  );
  readonly dateFormat = computed(() => this.value().timestampFormat);
  readonly autoMarkRead = computed(() => this.value().autoMarkRead);
}
