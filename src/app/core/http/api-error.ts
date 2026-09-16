import { HttpErrorResponse } from '@angular/common/http';

/** Error body sent by the API (see `AllExceptionsFilter` on the server). */
export interface ApiErrorBody {
  statusCode: number;
  message: string;
  /** Machine-readable reason, e.g. `EMAIL_NOT_VERIFIED`. */
  code?: string;
  /** Every validation message when the request body was invalid. */
  errors?: string[];
}

export function getApiError(error: unknown): ApiErrorBody | null {
  if (
    error instanceof HttpErrorResponse &&
    typeof error.error === 'object' &&
    error.error !== null &&
    'message' in error.error
  ) {
    return error.error as ApiErrorBody;
  }
  return null;
}

/** A message that can be shown to the user for any failed API call. */
export function getApiErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  if (error instanceof HttpErrorResponse && error.status === 0) {
    return 'Cannot reach the server. Check your connection and try again.';
  }
  return getApiError(error)?.message ?? fallback;
}
