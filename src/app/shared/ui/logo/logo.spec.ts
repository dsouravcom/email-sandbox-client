import { TestBed } from '@angular/core/testing';
import { AppLogo } from './logo';

describe('AppLogo', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppLogo],
    }).compileComponents();
  });

  it('should create the logo component', () => {
    const fixture = TestBed.createComponent(AppLogo);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the custom SVG mark with correct viewBox and paths', () => {
    const fixture = TestBed.createComponent(AppLogo);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const svg = element.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('viewBox')).toBe('0 0 36 36');
    expect(svg?.querySelectorAll('path').length).toBeGreaterThanOrEqual(3);
  });

  it('should render wordmark when showWordmark is true', () => {
    const fixture = TestBed.createComponent(AppLogo);
    fixture.componentRef.setInput('showWordmark', true);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Email');
    expect(element.textContent).toContain('Sandbox');
  });

  it('should hide wordmark when showWordmark is false', () => {
    const fixture = TestBed.createComponent(AppLogo);
    fixture.componentRef.setInput('showWordmark', false);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('span')).toBeNull();
  });
});
