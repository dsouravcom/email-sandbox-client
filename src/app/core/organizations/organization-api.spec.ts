import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../http/api-base-url';
import { OrganizationApi } from './organization-api';

describe('OrganizationApi plan compatibility', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [
    provideHttpClient(), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: '/api' },
  ] }));
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('rejects the legacy five-inbox response before a template reads missing limits', async () => {
    const result = firstValueFrom(TestBed.inject(OrganizationApi).get('test'));
    const assertion = expect(result).rejects.toThrow('Organization plan details could not be loaded');
    TestBed.inject(HttpTestingController).expectOne('/api/organizations/test').flush({
      id: 'test', name: 'Legacy', plan: 'free', maxMailboxes: 5, retentionDays: 30,
    });
    await assertion;
  });
});
