import { Component, computed, effect, inject, signal } from '@angular/core';
import { form, FormField, FormRoot, max, maxLength, min, readonly, required } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { getApiErrorMessage } from '../../../core/http/api-error';
import { OrganizationApi } from '../../../core/organizations/organization-api';
import { OrganizationStore } from '../../../core/organizations/organization-store';
import { Toast } from '../../../core/notifications/toast';
import { FieldError } from '../../../shared/ui/field-error/field-error';

@Component({
  selector: 'app-organization-settings',
  imports: [FormRoot, FormField, FieldError],
  templateUrl: './organization-settings.html',
})
export class OrganizationSettings {
  private readonly api = inject(OrganizationApi);
  private readonly toast = inject(Toast);
  protected readonly organizationStore = inject(OrganizationStore);

  protected readonly organization = this.organizationStore.currentOrganization;
  protected readonly canEdit = computed(() => {
    const role = this.organization()?.role;
    return role === 'owner' || role === 'admin';
  });

  protected readonly errorMessage = signal<string | null>(null);

  private readonly model = signal({ name: '', retentionDays: 30 });

  protected readonly settingsForm = form(this.model, (path) => {
    required(path.name, { message: 'Name is required' });
    maxLength(path.name, 100, { message: 'Name must be at most 100 characters' });
    readonly(path.name, { when: () => !this.canEdit() });
    required(path.retentionDays, { message: 'Retention period is required' });
    min(path.retentionDays, 1, { message: 'Must be at least 1 day' });
    max(path.retentionDays, 3650, { message: 'Must be at most 3650 days' });
    readonly(path.retentionDays, { when: () => !this.canEdit() });
  }, {
    submission: {
      action: async (field) => {
        const organization = this.organization();
        if (!organization) return undefined;

        this.errorMessage.set(null);
        const value = field().value();
        try {
          const updated = await firstValueFrom(
            this.api.update(organization.id, { name: value.name, retentionDays: value.retentionDays }),
          );
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
    effect(() => {
      const organization = this.organization();
      if (organization) {
        this.model.set({ name: organization.name, retentionDays: organization.retentionDays });
      }
    });
  }
}
