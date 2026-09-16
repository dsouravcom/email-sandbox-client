import { Component, inject, signal } from '@angular/core';
import {
  email,
  form,
  FormField,
  FormRoot,
  maxLength,
  minLength,
  pattern,
  required,
  validate,
} from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthApi } from '../../../core/auth/auth-api';
import {
  AuthErrorCode,
  OTP_LENGTH,
  OTP_RESEND_COOLDOWN_SECONDS,
} from '../../../core/auth/auth-models';
import { getApiError, getApiErrorMessage } from '../../../core/http/api-error';
import { FieldError } from '../../../shared/ui/field-error/field-error';
import { createCountdown } from '../../../shared/utils/countdown';

@Component({
  imports: [FormRoot, FormField, RouterLink, FieldError],
  selector: 'app-reset-password',
  templateUrl: './reset-password.html',
})
export class ResetPassword {
  private readonly authApi = inject(AuthApi);
  private readonly router = inject(Router);

  /** Set by the forgot-password page; missing after a page reload. */
  private readonly navigationState = this.router.currentNavigation()?.extras.state;

  protected readonly notice = signal<string | null>(this.navigationState?.['notice'] ?? null);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly resending = signal(false);
  protected readonly resendCooldown = createCountdown(OTP_RESEND_COOLDOWN_SECONDS);

  protected readonly resetForm = form(
    signal({
      email: this.navigationState?.['email'] ?? '',
      code: '',
      password: '',
      confirmPassword: '',
    }),
    (path) => {
      required(path.email, { message: 'Email is required' });
      email(path.email, { message: 'Enter a valid email address' });

      required(path.code, { message: 'Enter the code from the email' });
      pattern(path.code, new RegExp(`^\\d{${OTP_LENGTH}}$`), {
        message: `The code has ${OTP_LENGTH} digits`,
      });

      required(path.password, { message: 'Password is required' });
      minLength(path.password, 8, { message: 'Password must be at least 8 characters' });
      maxLength(path.password, 128, { message: 'Password must be at most 128 characters' });

      required(path.confirmPassword, { message: 'Please confirm your password' });
      validate(path.confirmPassword, ({ value, valueOf }) =>
        value() === valueOf(path.password)
          ? undefined
          : { kind: 'passwordMismatch', message: 'Passwords do not match' },
      );
    },
    {
      submission: {
        action: async (field) => {
          this.errorMessage.set(null);
          const { email: address, code, password } = field().value();

          try {
            const { message } = await firstValueFrom(
              this.authApi.resetPassword({ email: address, code, password }),
            );
            await this.router.navigate(['/login'], { state: { notice: message } });
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
    if (this.navigationState?.['email']) {
      this.resendCooldown.start();
    }
  }

  protected async resend(): Promise<void> {
    const emailField = this.resetForm.email();
    if (emailField.invalid()) {
      emailField.markAsTouched();
      return;
    }

    this.resending.set(true);
    this.errorMessage.set(null);
    try {
      const { message } = await firstValueFrom(this.authApi.forgotPassword(emailField.value()));
      this.notice.set(message);
      this.resendCooldown.start();
    } catch (error) {
      this.errorMessage.set(getApiErrorMessage(error));
    } finally {
      this.resending.set(false);
    }
  }
}
