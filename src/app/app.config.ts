import { isPlatformBrowser } from '@angular/common';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  PLATFORM_ID,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideClientHydration } from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideIcons } from '@ng-icons/core';
import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth-interceptor';
import { AuthStore } from './core/auth/auth-store';
import { appIcons } from './core/icons';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideClientHydration(),
    // HttpClient is available by default; this adds the auth interceptor to it.
    provideHttpClient(withInterceptors([authInterceptor])),
    provideIcons(appIcons),
    // Restore the session before the first navigation, so guards know who is signed in.
    provideAppInitializer(() => {
      // The refresh cookie only exists in the browser (skipped during SSR builds).
      if (isPlatformBrowser(inject(PLATFORM_ID))) {
        return inject(AuthStore).restoreSession();
      }
      return undefined;
    }),
  ],
};
