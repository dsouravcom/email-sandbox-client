import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SafeEmailHtml } from './safe-email-html';

@Component({
  imports: [SafeEmailHtml],
  template: `<app-safe-email-html [html]="html" />`,
})
class HostFixture {
  html = '<p>hello</p><script>window.__pwned = true;</script>';
}

describe('SafeEmailHtml', () => {
  it('renders untrusted content into an iframe with an empty (maximally restrictive) sandbox attribute', async () => {
    const fixture = TestBed.createComponent(HostFixture);
    fixture.detectChanges();
    await fixture.whenStable();

    const iframe = fixture.nativeElement.querySelector('iframe') as HTMLIFrameElement;
    expect(iframe.getAttribute('sandbox')).toBe('');
    expect(iframe.getAttribute('referrerpolicy')).toBe('no-referrer');
  });

  it('never binds the untrusted HTML via innerHTML — it only ever reaches the iframe srcdoc', async () => {
    const fixture = TestBed.createComponent(HostFixture);
    fixture.detectChanges();
    await fixture.whenStable();

    // The untrusted markup must never be parsed into the LIGHT DOM as real
    // elements (which [innerHTML] would do) — only into the iframe's `srcdoc`
    // *string* attribute, which the browser parses solely inside that
    // iframe's own isolated document, never the main page's DOM.
    expect(fixture.nativeElement.querySelector('script')).toBeNull();
    expect(fixture.nativeElement.querySelector('p')).toBeNull();

    const iframe = fixture.nativeElement.querySelector('iframe') as HTMLIFrameElement;
    expect(iframe.srcdoc).toContain('<p>hello</p>');
    expect(iframe.srcdoc).toContain('Content-Security-Policy');
  });

  it('does not actually execute scripts from the untrusted content', async () => {
    const fixture = TestBed.createComponent(HostFixture);
    fixture.detectChanges();
    await fixture.whenStable();

    expect((window as unknown as { __pwned?: boolean }).__pwned).toBeUndefined();
  });
});
