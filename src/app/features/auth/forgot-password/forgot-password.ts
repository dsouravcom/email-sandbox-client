import { Component, inject, signal } from '@angular/core';
import { email, form, FormField, FormRoot, required } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthApi } from '../../../core/auth/auth-api';
import { getApiErrorMessage } from '../../../core/http/api-error';
import { FieldError } from '../../../shared/ui/field-error/field-error';

@Component({
  imports: [FormRoot, FormField, RouterLink, FieldError],
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.html',
})
export class ForgotPassword {
  private readonly authApi = inject(AuthApi);
  private readonly router = inject(Router);

  /** Set when arriving from the profile page's "reset password" action; missing after a page reload. */
  private readonly navigationState = this.router.currentNavigation()?.extras.state;

  protected readonly errorMessage = signal<string | null>(null);

  protected readonly forgotForm = form(
    signal({ email: this.navigationState?.['email'] ?? '' }),
    (path) => {
      required(path.email, { message: 'Email is required' });
      email(path.email, { message: 'Enter a valid email address' });
    },
    {
      submission: {
        action: async (field) => {
          this.errorMessage.set(null);
          const { email: address } = field().value();

          try {
            const { message } = await firstValueFrom(this.authApi.forgotPassword(address));
            await this.router.navigate(['/reset-password'], {
              state: { email: address, notice: message },
            });
          } catch (error) {
            this.errorMessage.set(getApiErrorMessage(error));
          }
          return undefined;
        },
      },
    },
  );
}
