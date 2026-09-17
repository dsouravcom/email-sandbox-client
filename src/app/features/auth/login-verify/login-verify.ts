import { Component, inject, signal } from '@angular/core';
import { email, form, FormField, FormRoot, pattern, required } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthApi } from '../../../core/auth/auth-api';
import {
  AuthErrorCode,
  OTP_LENGTH,
  OTP_RESEND_COOLDOWN_SECONDS,
} from '../../../core/auth/auth-models';
import { AuthStore } from '../../../core/auth/auth-store';
import { getApiError, getApiErrorMessage } from '../../../core/http/api-error';
import { FieldError } from '../../../shared/ui/field-error/field-error';
import { createCountdown } from '../../../shared/utils/countdown';

@Component({
  imports: [FormRoot, FormField, RouterLink, FieldError],
  selector: 'app-login-verify',
  templateUrl: './login-verify.html',
})
export class LoginVerify {
  private readonly authApi = inject(AuthApi);
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);

  /** Set by the login page; missing after a page reload, so the email stays editable. */
  private readonly navigationState = this.router.currentNavigation()?.extras.state;

  protected readonly notice = signal<string | null>(this.navigationState?.['notice'] ?? null);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly resending = signal(false);
  protected readonly resendCooldown = createCountdown(OTP_RESEND_COOLDOWN_SECONDS);

  protected readonly verifyForm = form(
    signal({ email: this.navigationState?.['email'] ?? '', code: '' }),
    (path) => {
      required(path.email, { message: 'Email is required' });
      email(path.email, { message: 'Enter a valid email address' });
      required(path.code, { message: 'Enter the code from the email' });
      pattern(path.code, new RegExp(`^\\d{${OTP_LENGTH}}$`), {
        message: `The code has ${OTP_LENGTH} digits`,
      });
    },
    {
      submission: {
        action: async (field) => {
          this.errorMessage.set(null);

          try {
            await this.authStore.verifyLogin(field().value());
            await this.router.navigateByUrl(this.navigationState?.['returnUrl'] ?? '/');
          } catch (error) {
            const apiError = getApiError(error);
            if (
              apiError?.code === AuthErrorCode.OTP_INVALID ||
              apiError?.code === AuthErrorCode.OTP_EXPIRED
            ) {
              return { kind: 'otp', message: apiError.message, fieldTree: field.code };
            }
            this.errorMessage.set(getApiErrorMessage(error));
          }
          return undefined;
        },
      },
    },
  );

  constructor() {
    // Arriving from sign-in means a code was just sent.
    if (this.navigationState?.['email']) {
      this.resendCooldown.start();
    }
  }

  protected async resend(): Promise<void> {
    const emailField = this.verifyForm.email();
    if (emailField.invalid()) {
      emailField.markAsTouched();
      return;
    }

    this.resending.set(true);
    this.errorMessage.set(null);
    try {
      const { message } = await firstValueFrom(this.authApi.resendLoginCode(emailField.value()));
      this.notice.set(message);
      this.resendCooldown.start();
    } catch (error) {
      this.errorMessage.set(getApiErrorMessage(error));
    } finally {
      this.resending.set(false);
    }
  }
}
