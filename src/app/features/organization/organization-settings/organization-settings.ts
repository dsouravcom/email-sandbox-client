import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { form, FormField, FormRoot, maxLength, readonly, required } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { firstValueFrom } from 'rxjs';
import { getApiErrorMessage } from '../../../core/http/api-error';
import { OrganizationApi } from '../../../core/organizations/organization-api';
import { Organization } from '../../../core/organizations/organization-models';
import { OrganizationStore } from '../../../core/organizations/organization-store';
import { MailboxStore } from '../../../core/mailboxes/mailbox-store';
import { Toast } from '../../../core/notifications/toast';
import { CopyButton } from '../../../shared/ui/copy-button/copy-button';
import { FieldError } from '../../../shared/ui/field-error/field-error';

@Component({
  selector: 'app-organization-settings',
  imports: [FormRoot, FormField, FieldError, DatePipe, DecimalPipe, RouterLink, NgIcon, CopyButton],
  templateUrl: './organization-settings.html',
})
export class OrganizationSettings {
  private readonly api = inject(OrganizationApi);
  private readonly toast = inject(Toast);
  protected readonly organizationStore = inject(OrganizationStore);
  protected readonly mailboxStore = inject(MailboxStore);
  protected readonly organization = signal<Organization | null>(null);
  protected readonly loading = signal(false);
  protected readonly loadError = signal<string | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
  private readonly refreshKey = signal(0);
  private readonly model = signal({ name: '' });

  protected readonly canEdit = computed(() => {
    const role = this.organization()?.role;
    return role === 'owner' || role === 'admin';
  });
  protected readonly inboxes = computed(() => this.mailboxStore.mailboxes()
    .filter((mailbox) => mailbox.organizationId === this.organization()?.id));
  protected readonly emailUsagePercent = computed(() => this.percent(this.organization()?.monthlyUsage, this.organization()?.limits.emailsPerMonth));
  protected readonly inboxUsagePercent = computed(() => this.percent(this.organization()?.mailboxCount, this.organization()?.limits.maxMailboxes));
  protected readonly memberUsagePercent = computed(() => this.percent(this.organization()?.teamMemberCount, this.organization()?.limits.maxTeamMembers));

  protected readonly settingsForm = form(this.model, (path) => {
    required(path.name, { message: 'Name is required' });
    maxLength(path.name, 100, { message: 'Name must be at most 100 characters' });
    readonly(path.name, { when: () => !this.canEdit() });
  }, {
    submission: {
      action: async (field) => {
        const organization = this.organization();
        if (!organization || !this.canEdit()) return undefined;
        this.errorMessage.set(null);
        try {
          const updated = await firstValueFrom(this.api.update(organization.id, { name: field().value().name }));
          this.organization.set(updated);
          this.organizationStore.applyUpdate(updated);
          this.toast.success('Organization settings saved.');
        } catch (error) {
          this.errorMessage.set(getApiErrorMessage(error));
        }
        return undefined;
      },
    },
  });

  constructor() {
    effect((onCleanup) => {
      const id = this.organizationStore.currentOrganizationId();
      this.refreshKey();
      this.organization.set(null);
      this.loadError.set(null);
      this.errorMessage.set(null);
      this.loading.set(false);
      if (!id) return;
      this.loading.set(true);
      const subscription = this.api.get(id).subscribe({
        next: (organization) => {
          this.organization.set(organization);
          this.model.set({ name: organization.name });
          this.loading.set(false);
          untracked(() => this.organizationStore.applyUpdate(organization));
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.loadError.set(getApiErrorMessage(error, 'Organization details could not be loaded. Please try again shortly.'));
        },
      });
      onCleanup(() => subscription.unsubscribe());
    });
  }

  protected refresh(): void {
    const id = this.organizationStore.currentOrganizationId();
    if (!id) {
      void this.organizationStore.loadOrganizations();
      return;
    }
    this.refreshKey.update((key) => key + 1);
    void this.mailboxStore.loadForOrganization(id);
  }

  private percent(value = 0, limit = 0): number {
    return limit > 0 ? Math.min(100, Math.max(0, value / limit * 100)) : 0;
  }
}
