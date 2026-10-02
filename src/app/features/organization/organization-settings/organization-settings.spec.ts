import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideIcons } from '@ng-icons/core';
import { of, Subject, throwError } from 'rxjs';
import { appIcons } from '../../../core/icons';
import { MailboxStore } from '../../../core/mailboxes/mailbox-store';
import { OrganizationApi } from '../../../core/organizations/organization-api';
import { Organization } from '../../../core/organizations/organization-models';
import { OrganizationStore } from '../../../core/organizations/organization-store';
import { Toast } from '../../../core/notifications/toast';
import { OrganizationSettings } from './organization-settings';
import { AuthStore } from '../../../core/auth/auth-store';

const organization: Organization = {
  id: 'org-test', name: 'Acme', slug: null, isPersonal: true, plan: 'free',
  role: 'owner', createdAt: '2026-01-01T00:00:00Z', billingPeriod: null,
  planStartedAt: null, planExpiresAt: null, monthlyUsage: 12, mailboxCount: 1,
  teamMemberCount: 1, usageResetsAt: '2026-11-01T00:00:00Z',
  retentionDays: 365, maxMailboxes: 1, maxMessagesPerMailbox: null,
  limits: { emailsPerSecond: 1, emailsPerMonth: 100, maxMailboxes: 1,
    maxTeamMembers: 1, maxEmailSizeMb: 5, retentionDays: 365 },
};

describe('OrganizationSettings', () => {
  let api: Record<'get' | 'update' | 'members' | 'incoming' | 'outgoing' | 'create' | 'respond', ReturnType<typeof vi.fn>>;
  beforeEach(async () => {
    api = { get: vi.fn(() => of(organization)), update: vi.fn(), members: vi.fn(() => of([])), incoming: vi.fn(() => of([])), outgoing: vi.fn(() => of([])), create: vi.fn(() => of({ ...organization, id: 'new-org' })), respond: vi.fn(() => of({ organizationId: 'joined-org' })) };
    await TestBed.configureTestingModule({
      imports: [OrganizationSettings],
      providers: [provideRouter([]), provideIcons(appIcons),
        { provide: AuthStore, useValue: { user: signal({ id: 'owner-id' }) } },
        { provide: OrganizationApi, useValue: api },
        { provide: OrganizationStore, useValue: {
          currentOrganizationId: signal(organization.id), loading: signal(false),
          error: signal(null), applyUpdate: vi.fn(), loadOrganizations: vi.fn(),
          organizations: signal([organization]), selectOrganization: vi.fn(),
        } },
        { provide: MailboxStore, useValue: {
          mailboxes: signal([]), loading: signal(false), error: signal(null), loadForOrganization: vi.fn(),
        } },
        { provide: Toast, useValue: { success: vi.fn() } },
      ],
    }).compileComponents();
  });

  it('fills the organization name and displays fresh server limits and usage', async () => {
    const fixture = TestBed.createComponent(OrganizationSettings);
    fixture.detectChanges();
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('100');
    expect(element.textContent).toContain('1 year');
    expect(element.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('12');
    expect(element.querySelectorAll('[role="progressbar"]')).toHaveLength(3);
    const settings = [...element.querySelectorAll('nav button')].find((button) => button.textContent?.trim() === 'settings') as HTMLButtonElement;
    settings.click(); fixture.detectChanges(); await fixture.whenStable();
    expect((element.querySelector('#org-name') as HTMLInputElement).value).toBe('Acme');
    expect(element.textContent).toContain('Organization ID');
    expect(element.querySelector('button[type="submit"]')).not.toBeNull();
  });

  it('waits for complete API data instead of rendering blank plan fields', async () => {
    const response = new Subject<Organization>();
    api.get.mockReturnValue(response);
    const fixture = TestBed.createComponent(OrganizationSettings);
    fixture.detectChanges();
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(element.querySelector('#org-name')).toBeNull();
    response.next(organization);
    response.complete();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(element.textContent).toContain('Monthly emails');
  });

  it('shows a retry action when loading fails and hides incomplete settings', async () => {
    api.get.mockReturnValue(throwError(() => new Error('Unavailable')));
    const fixture = TestBed.createComponent(OrganizationSettings);
    fixture.detectChanges();
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('[role="alert"]')?.textContent).toContain('Try again');
    expect(element.querySelector('#org-name')).toBeNull();
  });

  it('hides member administration and outgoing invitations for viewers', async () => {
    api.get.mockReturnValue(of({ ...organization, role: 'viewer' }));
    api.members.mockReturnValue(of([{ id: 'member-1', userId: 'other', name: 'Alex', email: 'alex@example.test', role: 'member', status: 'active' }]));
    const fixture = TestBed.createComponent(OrganizationSettings); fixture.detectChanges(); await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    ([...element.querySelectorAll('nav button')].find((button) => button.textContent?.trim() === 'members') as HTMLButtonElement).click(); fixture.detectChanges(); await fixture.whenStable();
    expect(element.textContent).toContain('Alex');
    expect(element.querySelector('select')).toBeNull();
    expect([...element.querySelectorAll('button')].some((button) => button.textContent?.trim() === 'Suspend')).toBe(false);
    expect(element.textContent).not.toContain('Make owner');
    expect(api.outgoing).not.toHaveBeenCalled();
  });

  it('creates an organization and selects it through the organization store', async () => {
    const fixture = TestBed.createComponent(OrganizationSettings); fixture.detectChanges(); await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    ([...element.querySelectorAll('nav button')].find((button) => button.textContent?.trim() === 'organizations') as HTMLButtonElement).click(); fixture.detectChanges(); await fixture.whenStable();
    const input = element.querySelector('#new-org-name') as HTMLInputElement; input.value = 'Acme Labs'; input.dispatchEvent(new Event('input')); fixture.detectChanges(); await fixture.whenStable();
    input.closest('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await fixture.whenStable();
    expect(api.create).toHaveBeenCalledWith('Acme Labs');
    expect(TestBed.inject(OrganizationStore).selectOrganization).toHaveBeenCalledWith('new-org');
  });

  it('accepts incoming invitations and switches to the joined organization', async () => {
    api.incoming.mockReturnValue(of([{ id: 'invite-1', organizationId: 'joined-org', organizationName: 'Acme Labs', email: 'alex@example.test', role: 'member', expiresAt: '2026-12-01T00:00:00Z' }]));
    const fixture = TestBed.createComponent(OrganizationSettings); fixture.detectChanges(); await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    ([...element.querySelectorAll('nav button')].find((button) => button.textContent?.trim().startsWith('invitations')) as HTMLButtonElement).click(); fixture.detectChanges(); await fixture.whenStable();
    ([...element.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Accept') as HTMLButtonElement).click(); await fixture.whenStable();
    expect(api.respond).toHaveBeenCalledWith('invite-1', 'accept');
    expect(TestBed.inject(OrganizationStore).selectOrganization).toHaveBeenCalledWith('joined-org');
  });
});
