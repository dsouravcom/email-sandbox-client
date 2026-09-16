import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from './auth-store';

/** Keeps signed-in users away from the sign-in and sign-up pages. */
export const guestGuard: CanActivateFn = () => {
  if (inject(AuthStore).isAuthenticated()) {
    return inject(Router).createUrlTree(['/']);
  }
  return true;
};
