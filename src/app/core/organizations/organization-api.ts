import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_BASE_URL } from '../http/api-base-url';
import { Organization, UpdateOrganizationRequest } from './organization-models';

interface OrganizationListResponse {
  data: Organization[];
}

/** Reject incomplete/legacy responses before they can break a settings template. */
function requirePlanData(organization: Organization): Organization {
  const limits = organization?.limits;
  if (!limits || !Number.isFinite(limits.emailsPerMonth) ||
      !Number.isFinite(limits.emailsPerSecond) || !Number.isFinite(limits.maxMailboxes) ||
      !Number.isFinite(limits.maxTeamMembers) || !Number.isFinite(limits.maxEmailSizeMb) ||
      (limits.retentionDays !== null && !Number.isFinite(limits.retentionDays)) ||
      !Number.isFinite(organization.monthlyUsage) || !Number.isFinite(organization.mailboxCount) ||
      !Number.isFinite(organization.teamMemberCount) || !organization.usageResetsAt) {
    throw new Error('Organization plan details could not be loaded. Please try again shortly.');
  }
  return organization;
}

/** HTTP calls to the `/organizations` endpoints. */
@Service()
export class OrganizationApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${inject(API_BASE_URL)}/organizations`;

  /** Every organization the signed-in user actively belongs to. */
  list(): Observable<OrganizationListResponse> {
    return this.http.get<OrganizationListResponse>(this.url).pipe(
      map((response) => ({ data: response.data.map(requirePlanData) })),
    );
  }

  get(organizationId: string): Observable<Organization> {
    return this.http.get<Organization>(`${this.url}/${organizationId}`).pipe(map(requirePlanData));
  }

  update(organizationId: string, body: UpdateOrganizationRequest): Observable<Organization> {
    return this.http.patch<Organization>(`${this.url}/${organizationId}`, body).pipe(map(requirePlanData));
  }
}
