import { computed, inject, Service, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthApi } from './auth-api';
import { AuthResponse, LoginRequest, ProvisioningResult, User, VerifyEmailRequest } from './auth-models';

/**
 * Single source of truth for the signed-in user.
 *
 * The access token is kept in memory only (never in localStorage), so an
 * injected script can't read it from storage. After a page reload it is
 * recovered with the httpOnly refresh cookie in `restoreSession()`.
 */
@Service()
export class AuthStore {
  private readonly api = inject(AuthApi);

  private readonly _user = signal<User | null>(null);
  private readonly _accessToken = signal<string | null>(null);
  private readonly _lastProvisioning = signal<ProvisioningResult | null>(null);
  private refreshInFlight: Promise<string | null> | null = null;

  readonly user = this._user.asReadonly();
  readonly accessToken = this._accessToken.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);

  /** Runs once at startup (see `app.config.ts`) to sign the user back in. */
  async restoreSession(): Promise<void> {
    await this.refreshAccessToken();
  }

  async login(credentials: LoginRequest): Promise<void> {
    this.setSession(await firstValueFrom(this.api.login(credentials)));
  }

  /** Verifying the email also signs the user in. */
  async verifyEmail(request: VerifyEmailRequest): Promise<void> {
    this.setSession(await firstValueFrom(this.api.verifyEmail(request)));
  }

  /**
   * Exchanges the refresh cookie for a new access token. Concurrent callers
   * share a single request, so a burst of 401s causes only one refresh.
   * Resolves to `null`, and clears the session, when the user must sign in again.
   */
  refreshAccessToken(): Promise<string | null> {
    this.refreshInFlight ??= firstValueFrom(this.api.refresh())
      .then((response) => {
        this.setSession(response);
        return response.accessToken;
      })
      .catch(() => {
        this.clearSession();
        return null;
      })
      .finally(() => {
        this.refreshInFlight = null;
      });

    return this.refreshInFlight;
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(this.api.logout());
    } catch {
      // Signing out locally still works if the request fails.
    } finally {
      this.clearSession();
    }
  }

  clearSession(): void {
    this._user.set(null);
    this._accessToken.set(null);
    this._lastProvisioning.set(null);
  }

  /**
   * Reads and clears the one-time provisioning info from the last sign-in
   * (default org/mailbox/SMTP credential). `null` once read, and always
   * `null` after `login()`/`refreshAccessToken()`, which never carry it.
   */
  consumeLastProvisioning(): ProvisioningResult | null {
    const provisioning = this._lastProvisioning();
    this._lastProvisioning.set(null);
    return provisioning;
  }

  private setSession({ accessToken, user, provisioning }: AuthResponse): void {
    this._accessToken.set(accessToken);
    this._user.set(user);
    if (provisioning) {
      this._lastProvisioning.set(provisioning);
    }
  }
}
