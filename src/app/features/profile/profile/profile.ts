import { DatePipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import type { User } from '../../../core/auth/auth-models';
import { AuthStore } from '../../../core/auth/auth-store';
import { API_BASE_URL } from '../../../core/http/api-base-url';
import { getApiErrorMessage } from '../../../core/http/api-error';
import { ErrorState } from '../../../shared/ui/error-state/error-state';
import { Skeleton } from '../../../shared/ui/skeleton/skeleton';

@Component({
  selector: 'app-profile',
  imports: [DatePipe, ErrorState, Skeleton],
  templateUrl: './profile.html',
})
export class Profile {
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);

  /** The interceptor attaches the access token and transparently refreshes it if expired. */
  protected readonly profile = httpResource<User>(() => `${this.apiBaseUrl}/users/me`);

  protected readonly profileError = computed(() => {
    const error = this.profile.error();
    return error ? getApiErrorMessage(error) : null;
  });

  /**
   * There's no "change password while signed in" endpoint — only the
   * unauthenticated forgot/reset-password OTP flow, which the route guards
   * only allow signed-out visitors to reach. Signing out first is the only
   * way to actually get there, so this does that instead of leaving a
   * dead-end link.
   */
  protected async resetPassword(): Promise<void> {
    await this.authStore.logout();
    await this.router.navigate(['/forgot-password'], {
      state: { email: this.profile.value()?.email },
    });
  }
}
