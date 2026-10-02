import { Component, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AccountApi, DEFAULT_PREFERENCES } from '../../core/account/account-api';
import { AuthStore } from '../../core/auth/auth-store';
import { Toast } from '../../core/notifications/toast';
import { getApiErrorMessage } from '../../core/http/api-error';
import { NgIcon } from '@ng-icons/core';
import { IconName } from '../../core/icons';
import { Theme, ThemePreference } from '../../core/theme/theme';

const PREFERENCE_ICON: Record<ThemePreference, IconName> = {
  light: 'lucideSun',
  dark: 'lucideMoon',
  system: 'lucideMonitor',
};

@Component({
  selector: 'app-theme-switcher',
  imports: [NgIcon],
  templateUrl: './theme-switcher.html',
})
export class ThemeSwitcher {
  private readonly account = inject(AccountApi);
  private readonly auth = inject(AuthStore);
  private readonly toast = inject(Toast);
  protected readonly busy = signal(false);
  protected readonly theme = inject(Theme);
  protected readonly icon = computed(() => PREFERENCE_ICON[this.theme.preference()]);

  protected async setPreference(preference: ThemePreference): Promise<void> {
    if (this.busy()) return;
    const user = this.auth.user();
    if (!user) {
      this.theme.setPreference(preference);
      return;
    }
    this.busy.set(true);
    try {
      this.auth.updateUser(
        await firstValueFrom(
          this.account.preferences({
            ...DEFAULT_PREFERENCES,
            ...user.preferences,
            theme: preference,
          }),
        ),
      );
    } catch (error) {
      this.toast.error(getApiErrorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }
}
