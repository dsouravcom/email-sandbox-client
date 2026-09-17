import { Component, inject, signal, viewChild } from '@angular/core';
import {
  email,
  form,
  FormField,
  FormRoot,
  maxLength,
  minLength,
  required,
  validate,
} from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthApi } from '../../../core/auth/auth-api';
import { AuthErrorCode } from '../../../core/auth/auth-models';
import { TURNSTILE_SITE_KEY } from '../../../core/http/turnstile-site-key';
import { getApiError, getApiErrorMessage } from '../../../core/http/api-error';
import { FieldError } from '../../../shared/ui/field-error/field-error';
import { Turnstile } from '../../../shared/ui/turnstile/turnstile';

@Component({
  imports: [FormRoot, FormField, RouterLink, FieldError, Turnstile],
  selector: 'app-register',
  templateUrl: './register.html',
})
export class Register {
  private readonly authApi = inject(AuthApi);
  private readonly router = inject(Router);

  protected readonly turnstileSiteKey = inject(TURNSTILE_SITE_KEY);
  private readonly turnstile = viewChild.required(Turnstile);

  protected readonly errorMessage = signal<string | null>(null);

  /** Same rules as the API's Zod schema, so most mistakes are caught before a request. */
  protected readonly registerForm = form(
    signal({ name: '', email: '', password: '', confirmPassword: '', turnstileToken: '' }),
    (path) => {
      required(path.name, { message: 'Name is required' });
      minLength(path.name, 2, { message: 'Name must be at least 2 characters' });
      maxLength(path.name, 100, { message: 'Name must be at most 100 characters' });

      required(path.email, { message: 'Email is required' });
      email(path.email, { message: 'Enter a valid email address' });

      required(path.password, { message: 'Password is required' });
      minLength(path.password, 8, { message: 'Password must be at least 8 characters' });
      maxLength(path.password, 128, { message: 'Password must be at most 128 characters' });

      required(path.confirmPassword, { message: 'Please confirm your password' });
      // Cross-field rule: re-evaluated whenever either password changes.
      validate(path.confirmPassword, ({ value, valueOf }) =>
        value() === valueOf(path.password)
          ? undefined
          : { kind: 'passwordMismatch', message: 'Passwords do not match' },
      );

      required(path.turnstileToken, { message: 'Please complete the verification challenge' });
    },
    {
      submission: {
        action: async (field) => {
          this.errorMessage.set(null);
          const account = field().value();

          try {
            await firstValueFrom(
              this.authApi.register({
                name: account.name,
                email: account.email,
                password: account.password,
                turnstileToken: account.turnstileToken,
              }),
            );
            await this.router.navigate(['/verify-email'], { state: { email: account.email } });
          } catch (error) {
            this.turnstile().reset();
            field.turnstileToken().value.set('');

            if (getApiError(error)?.code === AuthErrorCode.EMAIL_ALREADY_REGISTERED) {
              // Attached to the email field; cleared as soon as the email changes.
              return {
                kind: 'emailTaken',
                message: getApiErrorMessage(error),
                fieldTree: field.email,
              };
            }
            this.errorMessage.set(getApiErrorMessage(error));
          }
          return undefined;
        },
      },
    },
  );

  protected onTurnstileVerified(token: string): void {
    this.registerForm.turnstileToken().value.set(token);
  }

  protected onTurnstileExpired(): void {
    this.registerForm.turnstileToken().value.set('');
  }
}
