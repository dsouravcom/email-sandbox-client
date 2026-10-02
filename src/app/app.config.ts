import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, TitleStrategy, withComponentInputBinding } from '@angular/router';
import { SeoTitleStrategy } from './core/seo/seo-title-strategy';
import { provideIcons } from '@ng-icons/core';
import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth-interceptor';
import { AuthStore } from './core/auth/auth-store';
import { appIcons } from './core/icons';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    { provide: TitleStrategy, useClass: SeoTitleStrategy },
    // HttpClient is available by default; this adds the auth interceptor to it.
    provideHttpClient(withInterceptors([authInterceptor])),
    provideIcons(appIcons),
    // Restore the session before the first navigation, so guards know who is signed in.
    provideAppInitializer(() => inject(AuthStore).restoreSession()),
  ],
};
