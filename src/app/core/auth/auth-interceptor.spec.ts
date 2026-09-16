import { HttpClient, HttpContext, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../http/api-base-url';
import { SKIP_AUTH } from './auth-api';
import { authInterceptor } from './auth-interceptor';
import { AuthStore } from './auth-store';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpTesting: HttpTestingController;
  const refreshAccessToken = vi.fn<() => Promise<string | null>>();

  beforeEach(() => {
    refreshAccessToken.mockReset();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        // Explicit rather than relying on the token's own default, so this
        // test is unaffected by whatever API_BASE_URL a developer's .env
        // happens to have (see api-base-url.ts).
        { provide: API_BASE_URL, useValue: '/api' },
        {
          provide: AuthStore,
          useValue: { accessToken: signal('old-token').asReadonly(), refreshAccessToken },
        },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('adds the access token to API requests', async () => {
    const response = firstValueFrom(http.get('/api/users/me'));

    const request = httpTesting.expectOne('/api/users/me');
    expect(request.request.headers.get('Authorization')).toBe('Bearer old-token');
    request.flush({ id: '1' });

    await expect(response).resolves.toEqual({ id: '1' });
  });

  it('never sends the token to other hosts', () => {
    http.get('https://example.com/data').subscribe();

    const request = httpTesting.expectOne('https://example.com/data');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
  });

  it('leaves requests marked with SKIP_AUTH alone', () => {
    const context = new HttpContext().set(SKIP_AUTH, true);
    http.post('/api/auth/login', {}, { context }).subscribe({ error: () => undefined });

    const request = httpTesting.expectOne('/api/auth/login');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(refreshAccessToken).not.toHaveBeenCalled();
  });

  it('refreshes the token and retries once when the API answers 401', async () => {
    refreshAccessToken.mockResolvedValue('new-token');
    const response = firstValueFrom(http.get('/api/users/me'));

    httpTesting.expectOne('/api/users/me').flush(null, { status: 401, statusText: 'Unauthorized' });
    const retry = await vi.waitFor(() => httpTesting.expectOne('/api/users/me'));

    expect(retry.request.headers.get('Authorization')).toBe('Bearer new-token');
    retry.flush({ id: '1' });
    await expect(response).resolves.toEqual({ id: '1' });
    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
  });

  it('sends the user to the login page when the session cannot be refreshed', async () => {
    refreshAccessToken.mockResolvedValue(null);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const response = firstValueFrom(http.get('/api/users/me'));

    httpTesting.expectOne('/api/users/me').flush(null, { status: 401, statusText: 'Unauthorized' });

    await expect(response).rejects.toMatchObject({ status: 401 });
    expect(navigate).toHaveBeenCalledWith(['/login'], expect.anything());
  });
});
