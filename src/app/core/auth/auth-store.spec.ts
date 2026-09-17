import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthApi } from './auth-api';
import { AuthStore } from './auth-store';
import { AuthResponse, ProvisioningResult } from './auth-models';

function authResponse(provisioning: ProvisioningResult | null): AuthResponse {
  return {
    accessToken: 'token',
    user: { id: 'u1', name: 'Test', email: 't@example.com', emailVerifiedAt: null, createdAt: '2024-01-01T00:00:00.000Z' },
    provisioning,
  };
}

const provisioning: ProvisioningResult = {
  organization: { id: 'o1', name: 'Test' },
  mailbox: { id: 'm1', name: 'My Inbox', smtp: { host: 'localhost', port: 2526, secure: false, username: 'u', password: 'p' } },
};

describe('AuthStore', () => {
  let store: AuthStore;
  let api: { verifyEmail: ReturnType<typeof vi.fn>; verifyLogin: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    api = { verifyEmail: vi.fn(), verifyLogin: vi.fn() };
    TestBed.configureTestingModule({ providers: [{ provide: AuthApi, useValue: api }] });
    store = TestBed.inject(AuthStore);
  });

  it('exposes provisioning info exactly once after verify-email, then clears it', async () => {
    api.verifyEmail.mockReturnValue(of(authResponse(provisioning)));

    await store.verifyEmail({ email: 't@example.com', code: '123456' });

    expect(store.consumeLastProvisioning()).toEqual(provisioning);
    expect(store.consumeLastProvisioning()).toBeNull();
  });

  it('never surfaces provisioning info from a plain sign-in', async () => {
    api.verifyLogin.mockReturnValue(of(authResponse(null)));

    await store.verifyLogin({ email: 't@example.com', code: '123456' });

    expect(store.consumeLastProvisioning()).toBeNull();
    expect(store.isAuthenticated()).toBe(true);
  });

  it('discards any pending provisioning info when the session is cleared', async () => {
    api.verifyEmail.mockReturnValue(of(authResponse(provisioning)));
    await store.verifyEmail({ email: 't@example.com', code: '123456' });

    store.clearSession();

    expect(store.consumeLastProvisioning()).toBeNull();
    expect(store.isAuthenticated()).toBe(false);
  });
});
