import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideIcons } from '@ng-icons/core';
import { of, throwError } from 'rxjs';
import { AccountApi, DEFAULT_PREFERENCES } from '../../../core/account/account-api';
import { AuthStore } from '../../../core/auth/auth-store';
import { OrganizationStore } from '../../../core/organizations/organization-store';
import { Toast } from '../../../core/notifications/toast';
import { appIcons } from '../../../core/icons';
import { Profile } from './profile';

const user = {
  id: 'account-test',
  name: 'Alex Example',
  email: 'alex@example.test',
  createdAt: '2026-01-01T00:00:00Z',
  emailVerifiedAt: '2026-01-01T00:00:00Z',
  profileDetails: { company: 'Acme', jobTitle: 'Developer', bio: 'Testing emails.' },
  preferences: { ...DEFAULT_PREFERENCES },
};

describe('Profile and account settings', () => {
  let api: Record<
    'get' | 'update' | 'preferences' | 'password' | 'sessions' | 'revoke' | 'revokeOthers',
    ReturnType<typeof vi.fn>
  >;
  beforeEach(async () => {
    api = {
      get: vi.fn(() => of(user)),
      update: vi.fn(() => of({ ...user, name: 'Alex Updated' })),
      preferences: vi.fn(() => of(user)),
      password: vi.fn(() => of(undefined)),
      sessions: vi.fn(() =>
        of([
          {
            id: 'session-test',
            current: true,
            userAgent: 'Mozilla Windows Chrome/100',
            ipAddress: '127.0.0.1',
            createdAt: user.createdAt,
            lastActiveAt: user.createdAt,
            expiresAt: '2026-12-01T00:00:00Z',
          },
        ]),
      ),
      revoke: vi.fn(() => of(undefined)),
      revokeOthers: vi.fn(() => of(undefined)),
    };
    await TestBed.configureTestingModule({
      imports: [Profile],
      providers: [
        provideRouter([]),
        provideIcons(appIcons),
        { provide: AccountApi, useValue: api },
        { provide: AuthStore, useValue: { updateUser: vi.fn(), logout: vi.fn() } },
        {
          provide: OrganizationStore,
          useValue: { organizations: signal([]), selectOrganization: vi.fn() },
        },
        { provide: Toast, useValue: { success: vi.fn() } },
      ],
    }).compileComponents();
  });

  async function render() {
    const fixture = TestBed.createComponent(Profile);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture;
  }
  async function tab(fixture: Awaited<ReturnType<typeof render>>, label: string) {
    const element = fixture.nativeElement as HTMLElement;
    (
      [...element.querySelectorAll('nav button')].find(
        (button) => button.textContent?.trim() === label,
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();
  }
  function fill(element: HTMLElement, id: string, value: string) {
    const field = element.querySelector('#' + id) as HTMLInputElement;
    field.value = value;
    field.dispatchEvent(new Event('input'));
  }

  it('shows editable profile details, verified email and all account sections', async () => {
    const fixture = await render();
    const element = fixture.nativeElement as HTMLElement;
    expect((element.querySelector('#profile-name') as HTMLInputElement).value).toBe(user.name);
    expect((element.querySelector('#profile-company') as HTMLInputElement).value).toBe('Acme');
    expect(element.textContent).toContain('Email verified');
    expect(element.querySelectorAll('nav button')).toHaveLength(4);
    expect(element.querySelector('input[type="email"]')).toBeNull();
  });

  it('saves profile edits and updates the signed-in account menu', async () => {
    const fixture = await render();
    const element = fixture.nativeElement as HTMLElement;
    fill(element, 'profile-name', 'Alex Updated');
    fixture.detectChanges();
    await fixture.whenStable();
    element
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(api.update).toHaveBeenCalledWith('Alex Updated', user.profileDetails);
    expect(TestBed.inject(AuthStore).updateUser).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Alex Updated' }),
    );
  });

  it('lists current sessions and rejects mismatched password confirmation locally', async () => {
    const fixture = await render();
    await tab(fixture, 'security');
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('This session');
    expect(element.textContent).toContain('Chrome on Windows');
    fill(element, 'current-password', 'current-password');
    fill(element, 'new-password', 'different-password');
    fill(element, 'confirm-password', 'does-not-match');
    fixture.detectChanges();
    await fixture.whenStable();
    element
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
    expect(api.password).not.toHaveBeenCalled();
    expect(element.textContent).toContain('New passwords do not match');
  });

  it('saves inbox and timestamp preferences through the account API', async () => {
    const fixture = await render();
    await tab(fixture, 'preferences');
    const element = fixture.nativeElement as HTMLElement;
    const checkbox = element.querySelector('input[name="autoMarkRead"]') as HTMLInputElement;
    checkbox.click();
    fixture.detectChanges();
    await fixture.whenStable();
    element
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
    expect(api.preferences).toHaveBeenCalledWith({ ...DEFAULT_PREFERENCES, autoMarkRead: false });
  });

  it('shows a retry action when profile loading fails', async () => {
    api.get.mockReturnValue(throwError(() => new Error('Unable to load')));
    const fixture = await render();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('[role="alert"]')?.textContent).toContain('Try again');
    expect(element.querySelector('#profile-name')).toBeNull();
  });
});
