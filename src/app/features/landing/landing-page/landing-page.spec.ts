import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideIcons } from '@ng-icons/core';
import { appIcons } from '../../../core/icons';
import { AuthStore } from '../../../core/auth/auth-store';
import { AuthApi } from '../../../core/auth/auth-api';
import { LandingPage } from './landing-page';
import { of } from 'rxjs';

describe('LandingPage', () => {
  let mockAuthApi: Partial<AuthApi>;

  beforeEach(async () => {
    mockAuthApi = {
      refresh: () => of({ accessToken: 'test-token', user: null as any, provisioning: null }),
    };

    await TestBed.configureTestingModule({
      imports: [LandingPage],
      providers: [
        provideRouter([]),
        provideIcons(appIcons),
        { provide: AuthApi, useValue: mockAuthApi },
        AuthStore,
      ],
    }).compileComponents();
  });

  it('should create the landing page', () => {
    const fixture = TestBed.createComponent(LandingPage);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('offers Free registration and keeps every upcoming plan unavailable', async () => {
    const fixture = TestBed.createComponent(LandingPage);
    fixture.detectChanges();
    await fixture.whenStable();
    const pricing = (fixture.nativeElement as HTMLElement).querySelector('#pricing')!;
    expect(pricing.querySelectorAll('article')).toHaveLength(5);
    const links = pricing.querySelectorAll('a');
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute('href')).toBe('/register');
    const buttons = pricing.querySelectorAll('button');
    expect(buttons).toHaveLength(4);
    for (const button of buttons) {
      expect(button.disabled).toBe(true);
      expect(button.textContent).toContain('Coming soon');
    }
  });

  it('should render editorial hero headline, custom logo, and interactive demo', async () => {
    const fixture = TestBed.createComponent(LandingPage);
    fixture.detectChanges();
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Test transactional emails');
    expect(element.textContent).toContain('without spamming real customers');
    expect(element.querySelector('app-logo')).not.toBeNull();
    expect(element.querySelector('#demo')).not.toBeNull();
    expect(element.querySelector('#features')).not.toBeNull();
    expect(element.querySelector('#pricing')).not.toBeNull();
    expect(element.querySelector('#comparison')).not.toBeNull();
  });

  it('should simulate inbound email arrival with instant feedback', async () => {
    const fixture = TestBed.createComponent(LandingPage);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    const initialCount = (component as any).emails().length;
    (component as any).simulateSend();

    fixture.detectChanges();
    const updatedCount = (component as any).emails().length;
    expect(updatedCount).toBe(initialCount + 1);
    expect((component as any).simulatedStatus()).toContain('Sample email added');
  });

  it('should toggle device preview modes with realistic chassis widths', () => {
    const fixture = TestBed.createComponent(LandingPage);
    const component = fixture.componentInstance;

    expect((component as any).deviceMode()).toBe('desktop');
    (component as any).deviceMode.set('mobile');
    expect((component as any).deviceFrameClass()).toContain('max-w-[360px]');

    (component as any).deviceMode.set('tablet');
    expect((component as any).deviceFrameClass()).toContain('max-w-[580px]');
  });

  it('should switch hero credentials code tabs', () => {
    const fixture = TestBed.createComponent(LandingPage);
    const component = fixture.componentInstance;

    expect((component as any).heroCodeTab()).toBe('node');
    expect((component as any).activeHeroSnippet().code).toContain('smtp.email.dsourav.com');
    expect((component as any).activeHeroSnippet().code).toContain('2525');

    (component as any).heroCodeTab.set('curl');
    expect((component as any).activeHeroSnippet().code).toContain('smtp://smtp.email.dsourav.com:2525');

    (component as any).heroCodeTab.set('python');
    expect((component as any).activeHeroSnippet().code).toContain('smtp.email.dsourav.com');
  });

  it('should select email and toggle HTML and Text preview tabs', () => {
    const fixture = TestBed.createComponent(LandingPage);
    const component = fixture.componentInstance;

    expect((component as any).selectedEmailId()).toBe('email-acme-welcome');
    (component as any).selectEmail('email-smtp-test');
    expect((component as any).selectedEmailId()).toBe('email-smtp-test');
    expect((component as any).selectedEmail().subject).toBe('Your Acme test email');

    expect((component as any).contentTab()).toBe('html');
    (component as any).contentTab.set('text');
    expect((component as any).contentTab()).toBe('text');
  });

  it('should toggle FAQ accordion items', () => {
    const fixture = TestBed.createComponent(LandingPage);
    const component = fixture.componentInstance;

    expect((component as any).openFaqIndex()).toBe(0);
    (component as any).toggleFaq(1);
    expect((component as any).openFaqIndex()).toBe(1);
    (component as any).toggleFaq(1);
    expect((component as any).openFaqIndex()).toBeNull();
  });
});
