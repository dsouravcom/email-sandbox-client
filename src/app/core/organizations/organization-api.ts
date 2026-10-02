import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_BASE_URL } from '../http/api-base-url';
import { Organization, UpdateOrganizationRequest } from './organization-models';

interface OrganizationListResponse {
  data: Organization[];
}

export interface OrganizationMember {
  id: string; userId: string; name: string; email: string;
  role: 'owner' | 'admin' | 'member' | 'viewer'; status: 'active' | 'invited' | 'suspended'; joinedAt: string;
}
export interface OrganizationInvitation {
  id: string; organizationId: string; organizationName?: string; email: string;
  role: 'admin' | 'member' | 'viewer'; expiresAt: string;
  status?: 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired';
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

  create(name: string) { return this.http.post<Organization>(this.url, { name }).pipe(map(requirePlanData)); }
  members(id: string) { return this.http.get<OrganizationMember[]>(`${this.url}/${id}/members`); }
  incoming() { return this.http.get<OrganizationInvitation[]>(`${this.url}/invitations`); }
  outgoing(id: string) { return this.http.get<OrganizationInvitation[]>(`${this.url}/${id}/invitations`); }
  invite(id: string, email: string, role: OrganizationInvitation['role']) { return this.http.post(`${this.url}/${id}/invitations`, { email, role }); }
  cancel(id: string, invitationId: string) { return this.http.delete(`${this.url}/${id}/invitations/${invitationId}`); }
  respond(invitationId: string, action: 'accept' | 'decline') { return this.http.post<{ organizationId: string }>(`${this.url}/invitations/${invitationId}/${action}`, {}); }
  changeMember(id: string, memberId: string, body: { role?: OrganizationInvitation['role']; status?: 'active' | 'suspended' }) { return this.http.patch(`${this.url}/${id}/members/${memberId}`, body); }
  removeMember(id: string, memberId: string) { return this.http.delete(`${this.url}/${id}/members/${memberId}`); }
  leave(id: string) { return this.http.post(`${this.url}/${id}/leave`, {}); }
  transfer(id: string, memberId: string) { return this.http.post(`${this.url}/${id}/transfer-ownership`, { memberId }); }
}
