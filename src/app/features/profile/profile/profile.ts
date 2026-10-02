import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgIcon } from '@ng-icons/core';
import { firstValueFrom } from 'rxjs';
import {
  AccountApi,
  AccountPreferences,
  AccountSession,
  DEFAULT_PREFERENCES,
} from '../../../core/account/account-api';
import type { User } from '../../../core/auth/auth-models';
import { AuthStore } from '../../../core/auth/auth-store';
import { getApiErrorMessage } from '../../../core/http/api-error';
import { OrganizationStore } from '../../../core/organizations/organization-store';
import { Toast } from '../../../core/notifications/toast';
import { ConfirmDialog } from '../../../shared/ui/confirm-dialog/confirm-dialog';
import { CopyButton } from '../../../shared/ui/copy-button/copy-button';

@Component({
  selector: 'app-profile',
  imports: [DatePipe, FormsModule, RouterLink, NgIcon, ConfirmDialog, CopyButton],
  templateUrl: './profile.html',
})
export class Profile {
  private readonly api = inject(AccountApi);
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(Toast);
  protected readonly organizations = inject(OrganizationStore);
  protected readonly user = signal<User | null>(null);
  protected readonly tabs = ['profile', 'security', 'preferences', 'workspaces'] as const;
  protected readonly tab = signal<string>('profile');
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly sessions = signal<AccountSession[]>([]);
  protected readonly sessionsLoading = signal(false);
  protected readonly sessionsError = signal<string | null>(null);
  protected readonly passwordVisible = signal(false);
  protected readonly revoking = signal<AccountSession | 'others' | null>(null);
  protected profileValues = { name: '', company: '', jobTitle: '', bio: '' };
  protected preferenceValues: AccountPreferences = { ...DEFAULT_PREFERENCES };
  protected passwords = { current: '', next: '', confirmation: '' };
  private readonly sessionDialog = viewChild.required<ConfirmDialog>('sessionDialog');
  protected readonly initials = computed(() =>
    (this.user()?.name ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase(),
  );
  protected readonly otherSessionCount = computed(
    () => this.sessions().filter((session) => !session.current).length,
  );

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const requested = params.get('tab');
      if (requested && this.tabs.some((item) => item === requested)) this.selectTab(requested);
    });
    void this.reload();
  }

  protected selectTab(tab: string): void {
    this.tab.set(tab);
    this.actionError.set(null);
    if (tab === 'security') void this.loadSessions();
  }

  protected async reload(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    try {
      const user = await firstValueFrom(this.api.get());
      this.user.set(user);
      this.auth.updateUser(user);
      this.profileValues = {
        name: user.name,
        company: '',
        jobTitle: '',
        bio: '',
        ...user.profileDetails,
      };
      this.preferenceValues = { ...DEFAULT_PREFERENCES, ...user.preferences };
    } catch (error) {
      this.loadError.set(getApiErrorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  protected async saveProfile(): Promise<void> {
    await this.run(async () => {
      const { name, company, jobTitle, bio } = this.profileValues;
      const user = await firstValueFrom(
        this.api.update(name.trim(), {
          company: company.trim(),
          jobTitle: jobTitle.trim(),
          bio: bio.trim(),
        }),
      );
      this.user.set(user);
      this.auth.updateUser(user);
      this.profileValues = {
        name: user.name,
        company: '',
        jobTitle: '',
        bio: '',
        ...user.profileDetails,
      };
    }, 'Profile saved.');
  }

  protected async savePreferences(): Promise<void> {
    await this.run(async () => {
      const user = await firstValueFrom(this.api.preferences(this.preferenceValues));
      this.user.set(user);
      this.auth.updateUser(user);
      this.preferenceValues = { ...DEFAULT_PREFERENCES, ...user.preferences };
    }, 'Preferences saved.');
  }

  protected resetPreferences(): void {
    this.preferenceValues = { ...DEFAULT_PREFERENCES };
  }

  protected async changePassword(): Promise<void> {
    if (this.passwords.next !== this.passwords.confirmation) {
      this.actionError.set('New passwords do not match.');
      return;
    }
    await this.run(async () => {
      await firstValueFrom(this.api.password(this.passwords.current, this.passwords.next));
      this.passwords = { current: '', next: '', confirmation: '' };
      this.passwordVisible.set(false);
      await this.loadSessions();
    }, 'Password changed. Other sessions have been signed out.');
  }

  protected async loadSessions(): Promise<void> {
    if (this.sessionsLoading()) return;
    this.sessionsLoading.set(true);
    this.sessionsError.set(null);
    try {
      this.sessions.set(await firstValueFrom(this.api.sessions()));
    } catch (error) {
      this.sessionsError.set(getApiErrorMessage(error));
    } finally {
      this.sessionsLoading.set(false);
    }
  }

  protected requestRevoke(session: AccountSession | 'others'): void {
    this.revoking.set(session);
    this.sessionDialog().open();
  }

  protected async revokeConfirmed(): Promise<void> {
    const session = this.revoking();
    if (!session) return;
    await this.run(async () => {
      await firstValueFrom(
        session === 'others' ? this.api.revokeOthers() : this.api.revoke(session.id),
      );
      await this.loadSessions();
      this.revoking.set(null);
    }, 'Selected sessions signed out.');
  }

  protected deviceLabel(userAgent: string | null): string {
    if (!userAgent) return 'Unknown device';
    const browser = /Edg\//.test(userAgent)
      ? 'Edge'
      : /Firefox\//.test(userAgent)
        ? 'Firefox'
        : /Chrome\//.test(userAgent)
          ? 'Chrome'
          : /Safari\//.test(userAgent)
            ? 'Safari'
            : 'Browser';
    const device = /Android/.test(userAgent)
      ? 'Android'
      : /iPhone|iPad/.test(userAgent)
        ? 'iOS'
        : /Windows/.test(userAgent)
          ? 'Windows'
          : /Macintosh/.test(userAgent)
            ? 'macOS'
            : /Linux/.test(userAgent)
              ? 'Linux'
              : 'device';
    return `${browser} on ${device}`;
  }

  protected async openOrganization(id: string): Promise<void> {
    this.organizations.selectOrganization(id);
    await this.router.navigateByUrl('/organization');
  }
  protected async signOut(): Promise<void> {
    await this.auth.logout();
    await this.router.navigateByUrl('/login');
  }

  private async run(action: () => Promise<void>, message: string): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.actionError.set(null);
    try {
      await action();
      this.toast.success(message);
    } catch (error) {
      this.actionError.set(getApiErrorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }
}
