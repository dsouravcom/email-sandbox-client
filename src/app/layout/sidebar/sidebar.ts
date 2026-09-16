import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { filter, map } from 'rxjs';
import { ProfileMenu } from '../profile-menu/profile-menu';
import { ThemeSwitcher } from '../theme-switcher/theme-switcher';

/**
 * The narrow, icon-oriented primary navigation: Email and Organization
 * Settings, theme and profile pinned to the bottom.
 *
 * `host.class` gives this component's own host element (not just its
 * `<aside>` child) a definite height: daisyUI's drawer places this element
 * itself via a `.drawer-side > *` selector with non-stretching alignment, so
 * without an explicit height here the host — and therefore the `h-full`
 * `<aside>` inside it — collapses to content size instead of filling the
 * drawer on mobile.
 *
 * The "Email" link's active state is computed manually rather than via
 * `routerLinkActive`: the mailbox list (`/mailboxes`) and an open mailbox
 * (`/mailbox/:id`) intentionally use different first path segments (see
 * `app.routes.ts`), which `routerLinkActive` can't match as one group.
 */
@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, NgIcon, ThemeSwitcher, ProfileMenu],
  host: { class: 'h-full' },
  templateUrl: './sidebar.html',
})
export class Sidebar {
  private readonly router = inject(Router);

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  protected readonly isEmailSectionActive = computed(
    () => this.currentUrl().startsWith('/mailboxes') || this.currentUrl().startsWith('/mailbox/'),
  );
}
