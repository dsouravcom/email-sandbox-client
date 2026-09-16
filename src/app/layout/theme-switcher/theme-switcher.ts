import { Component, computed, inject } from '@angular/core';
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
  protected readonly theme = inject(Theme);
  protected readonly icon = computed(() => PREFERENCE_ICON[this.theme.preference()]);

  protected setPreference(preference: ThemePreference): void {
    this.theme.setPreference(preference);
  }
}
