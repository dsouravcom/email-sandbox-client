import { Component, inject } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { RouterLink } from '@angular/router';
import { OrganizationStore } from '../../core/organizations/organization-store';

/**
 * Switch between owned and joined organizations or open management.
 */
@Component({
  selector: 'app-organization-switcher',
  imports: [NgIcon, RouterLink],
  templateUrl: './organization-switcher.html',
})
export class OrganizationSwitcher {
  protected readonly store = inject(OrganizationStore);

  protected select(organizationId: string): void {
    if (organizationId === this.store.currentOrganizationId()) return;
    this.store.selectOrganization(organizationId);
  }
}
