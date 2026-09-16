import { Component, inject } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { OrganizationStore } from '../../core/organizations/organization-store';

/**
 * The API has no "create organization" endpoint — an organization is only
 * ever created automatically at email verification — so unlike a typical
 * multi-tenant switcher, this one never offers to create one.
 */
@Component({
  selector: 'app-organization-switcher',
  imports: [NgIcon],
  templateUrl: './organization-switcher.html',
})
export class OrganizationSwitcher {
  protected readonly store = inject(OrganizationStore);

  protected select(organizationId: string): void {
    if (organizationId === this.store.currentOrganizationId()) return;
    this.store.selectOrganization(organizationId);
  }
}
