/** Mirrors the API's `UserResponseDto`; dates arrive as ISO strings. */
export interface User {
  id: string;
  name: string;
  email: string;
  emailVerifiedAt: string | null;
  createdAt: string;
}

/**
 * One-time account setup info, present only on the single response that just
 * created the account's default organization, mailbox, and SMTP credential
 * (in practice: `verify-email`). `login`/`refresh` always send `null`. The
 * SMTP password here is shown exactly once and can never be fetched again.
 */
export interface ProvisioningResult {
  organization: { id: string; name: string };
  mailbox: {
    id: string;
    name: string;
    smtp: { host: string; port: number; secure: false; username: string; password: string };
  };
}

/** The refresh token isn't here: the API sets it as an httpOnly cookie. */
export interface AuthResponse {
  accessToken: string;
  user: User;
  provisioning: ProvisioningResult | null;
}

export interface MessageResponse {
  message: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  turnstileToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface VerifyEmailRequest {
  email: string;
  code: string;
}

export interface VerifyLoginRequest {
  email: string;
  code: string;
}

export interface ResetPasswordRequest {
  email: string;
  code: string;
  password: string;
}

/** Error codes the API uses for cases the UI handles specially. */
export const AuthErrorCode = {
  EMAIL_ALREADY_REGISTERED: 'EMAIL_ALREADY_REGISTERED',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  OTP_INVALID: 'OTP_INVALID',
  OTP_EXPIRED: 'OTP_EXPIRED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  TURNSTILE_FAILED: 'TURNSTILE_FAILED',
} as const;

/** Must match the server's OTP settings. */
export const OTP_LENGTH = 6;
export const OTP_RESEND_COOLDOWN_SECONDS = 60;
