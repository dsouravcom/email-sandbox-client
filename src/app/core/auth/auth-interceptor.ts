import {
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpRequest,
  HttpStatusCode,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { API_BASE_URL } from '../http/api-base-url';
import { SKIP_AUTH } from './auth-api';
import { AuthStore } from './auth-store';

const withAccessToken = (request: HttpRequest<unknown>, token: string) =>
  request.clone({ setHeaders: { Authorization: `Bearer ${token}` } });

/**
 * Adds the access token to API requests. When the API answers 401 (usually an
 * expired token), it refreshes the token once and retries the request. If the
 * refresh fails, the session is over and the user is sent to the login page.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const apiBaseUrl = inject(API_BASE_URL);

  // Never send the token to other hosts, and leave the auth endpoints alone.
  if (!req.url.startsWith(`${apiBaseUrl}/`) || req.context.get(SKIP_AUTH)) {
    return next(req);
  }

  const authStore = inject(AuthStore);
  const router = inject(Router);
  const token = authStore.accessToken();

  return next(token ? withAccessToken(req, token) : req).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== HttpStatusCode.Unauthorized) {
        return throwError(() => error);
      }

      return from(authStore.refreshAccessToken()).pipe(
        switchMap((newToken) => {
          if (!newToken) {
            void router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
            return throwError(() => error);
          }
          return next(withAccessToken(req, newToken));
        }),
      );
    }),
  );
};
