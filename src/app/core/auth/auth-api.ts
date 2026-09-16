import { HttpClient, HttpContext, HttpContextToken } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../http/api-base-url';
import {
  AuthResponse,
  LoginRequest,
  MessageResponse,
  RegisterRequest,
  ResetPasswordRequest,
  VerifyEmailRequest,
} from './auth-models';

/**
 * Marks requests the auth interceptor must leave alone: they don't need the
 * access token, and a 401 from them must not trigger a token refresh.
 */
export const SKIP_AUTH = new HttpContextToken<boolean>(() => false);

/** HTTP calls to the `/auth` endpoints. Session state lives in `AuthStore`. */
@Service()
export class AuthApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${inject(API_BASE_URL)}/auth`;

  register(body: RegisterRequest): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.url}/register`, body, this.options());
  }

  verifyEmail(body: VerifyEmailRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.url}/verify-email`, body, this.options());
  }

  resendVerification(email: string): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(
      `${this.url}/resend-verification`,
      { email },
      this.options(),
    );
  }

  login(body: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.url}/login`, body, this.options());
  }

  refresh(): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.url}/refresh`, null, this.options());
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.url}/logout`, null, this.options());
  }

  forgotPassword(email: string): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(
      `${this.url}/forgot-password`,
      { email },
      this.options(),
    );
  }

  resetPassword(body: ResetPasswordRequest): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.url}/reset-password`, body, this.options());
  }

  /** Auth endpoints read or set the refresh cookie and bypass the auth interceptor. */
  private options() {
    return {
      withCredentials: true,
      context: new HttpContext().set(SKIP_AUTH, true),
    };
  }
}
