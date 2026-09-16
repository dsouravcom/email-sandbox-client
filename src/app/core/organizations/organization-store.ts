import { isPlatformBrowser } from '@angular/common';
import { computed, inject, PLATFORM_ID, Service, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { getApiErrorMessage } from '../http/api-error';
import { OrganizationApi } from './organization-api';
import { Organization } from './organization-models';

const CURRENT_ORGANIZATION_KEY = 'current-organization-id';

/**
 * The signed-in user's organizations and which one is currently active.
 *
 * The API has no "create organization" endpoint today — an organization is
 * only ever created automatically at email verification — so this store
 * never exposes one either; see `docs` in the mailbox/organization-settings
 * components for where that would plug in if the API grows one.
 */
@Service()
export class OrganizationStore {
  private readonly api = inject(OrganizationApi);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly _organizations = signal<Organization[]>([]);
  private readonly _currentOrganizationId = signal<string | null>(null);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly organizations = this._organizations.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly currentOrganizationId = this._currentOrganizationId.asReadonly();
  readonly currentOrganization = computed(
    () => this._organizations().find((org) => org.id === this._currentOrganizationId()) ?? null,
  );

  /** Fetches every organization the user belongs to and picks the active one (persisted, falling back to the first). */
  async loadOrganizations(): Promise<void> {
    this._loading.set(true);
    this._error.set(null);
    try {
      const { data } = await firstValueFrom(this.api.list());
      this._organizations.set(data);
      const stored = this.readStoredId();
      const preferred = stored && data.some((org) => org.id === stored) ? stored : (data[0]?.id ?? null);
      this.selectOrganization(preferred);
    } catch (error) {
      this._error.set(getApiErrorMessage(error));
    } finally {
      this._loading.set(false);
    }
  }

  selectOrganization(organizationId: string | null): void {
    this._currentOrganizationId.set(organizationId);
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      if (organizationId) {
        localStorage.setItem(CURRENT_ORGANIZATION_KEY, organizationId);
      } else {
        localStorage.removeItem(CURRENT_ORGANIZATION_KEY);
      }
    } catch {
      // Storage unavailable — the choice just won't persist across reloads.
    }
  }

  /** Applies a fresh copy of the current organization after a settings update. */
  applyUpdate(organization: Organization): void {
    this._organizations.update((orgs) => orgs.map((org) => (org.id === organization.id ? organization : org)));
  }

  reset(): void {
    this._organizations.set([]);
    this._currentOrganizationId.set(null);
    this._error.set(null);
  }

  private readStoredId(): string | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    try {
      return localStorage.getItem(CURRENT_ORGANIZATION_KEY);
    } catch {
      return null;
    }
  }
}
