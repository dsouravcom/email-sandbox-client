import { Component, inject, signal } from '@angular/core';
import { email, form, FormField, FormRoot, required } from '@angular/forms/signals';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthErrorCode } from '../../../core/auth/auth-models';
import { AuthStore } from '../../../core/auth/auth-store';
import { getApiError, getApiErrorMessage } from '../../../core/http/api-error';
import { FieldError } from '../../../shared/ui/field-error/field-error';

@Component({
  imports: [FormRoot, FormField, RouterLink, FieldError],
  selector: 'app-login',
  templateUrl: './login.html',
})
export class Login {
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  /** Message handed over by the previous page, e.g. after a password reset. */
  protected readonly notice = signal<string | null>(
    this.router.currentNavigation()?.extras.state?.['notice'] ?? null,
  );
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly loginForm = form(
    signal({ email: '', password: '' }),
    (path) => {
      required(path.email, { message: 'Email is required' });
      email(path.email, { message: 'Enter a valid email address' });
      required(path.password, { message: 'Password is required' });
    },
    {
      submission: {
        // Only runs once the form is valid; `submitting()` is true meanwhile.
        action: async (field) => {
          this.errorMessage.set(null);
          const credentials = field().value();

          try {
            await this.authStore.login(credentials);
            await this.router.navigateByUrl(this.returnUrl());
          } catch (error) {
            if (getApiError(error)?.code === AuthErrorCode.EMAIL_NOT_VERIFIED) {
              await this.router.navigate(['/verify-email'], {
                state: { email: credentials.email, notice: getApiErrorMessage(error) },
              });
            } else {
              this.errorMessage.set(getApiErrorMessage(error));
            }
          }
          return undefined;
        },
      },
    },
  );

  /** Only in-app paths are allowed, so a crafted link can't redirect to another site. */
  private returnUrl(): string {
    const url = this.route.snapshot.queryParamMap.get('returnUrl');
    return url?.startsWith('/') && !url.startsWith('//') ? url : '/';
  }
}
