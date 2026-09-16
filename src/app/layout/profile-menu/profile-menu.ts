import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { AuthStore } from '../../core/auth/auth-store';

@Component({
  selector: 'app-profile-menu',
  imports: [RouterLink, NgIcon],
  templateUrl: './profile-menu.html',
})
export class ProfileMenu {
  protected readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);

  protected readonly initials = computed(() => {
    const name = this.authStore.user()?.name ?? '';
    const letters = name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]!.toUpperCase());
    return letters.length > 0 ? letters.join('') : '?';
  });

  protected async logout(): Promise<void> {
    this.closeMenu();
    await this.authStore.logout();
    await this.router.navigateByUrl('/login');
  }

  /**
   * daisyUI's dropdown stays open as long as something inside it has focus.
   * Clicking a `routerLink` navigates without ever blurring the link, so the
   * menu would otherwise stay open over the new page — blur explicitly closes it.
   */
  protected closeMenu(): void {
    (document.activeElement as HTMLElement | null)?.blur();
  }
}
