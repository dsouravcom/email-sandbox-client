import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../http/api-base-url';
import { Organization, UpdateOrganizationRequest } from './organization-models';

interface OrganizationListResponse {
  data: Organization[];
}

/** HTTP calls to the `/organizations` endpoints. */
@Service()
export class OrganizationApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${inject(API_BASE_URL)}/organizations`;

  /** Every organization the signed-in user actively belongs to. */
  list(): Observable<OrganizationListResponse> {
    return this.http.get<OrganizationListResponse>(this.url);
  }

  get(organizationId: string): Observable<Organization> {
    return this.http.get<Organization>(`${this.url}/${organizationId}`);
  }

  update(organizationId: string, body: UpdateOrganizationRequest): Observable<Organization> {
    return this.http.patch<Organization>(`${this.url}/${organizationId}`, body);
  }
}
