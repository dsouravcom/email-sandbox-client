import { Component, ElementRef, effect, input, viewChild } from '@angular/core';

/**
 * Renders untrusted email HTML with an empty `sandbox` attribute — the
 * strictest possible setting: no script execution, no same-origin access to
 * the rest of the app, no form submission, no top-level navigation, no
 * popups. `srcdoc` is used instead of a `src` URL because the API's HTML
 * render endpoint is Bearer-authenticated like every other route (there is
 * no public/token URL an `<iframe src>` could hit), so the caller fetches the
 * HTML itself and passes the string in here.
 *
 * A CSP `<meta>` tag is prepended as defense-in-depth on top of `sandbox`
 * (the response's own CSP header applies only to a direct navigation, never
 * to content assigned to `srcdoc`).
 */
@Component({
  selector: 'app-safe-email-html',
  imports: [],
  template: `
    <iframe
      #frame
      class="h-full w-full border-0 bg-white"
      sandbox=""
      referrerpolicy="no-referrer"
      title="Email content"
    ></iframe>
  `,
})
export class SafeEmailHtml {
  readonly html = input.required<string>();

  private readonly frameRef = viewChild.required<ElementRef<HTMLIFrameElement>>('frame');

  constructor() {
    effect(() => {
      this.frameRef().nativeElement.srcdoc = this.buildSrcdoc(this.html());
    });
  }

  private buildSrcdoc(html: string): string {
    const csp =
      '<meta http-equiv="Content-Security-Policy" ' +
      'content="default-src \'none\'; img-src data: http: https:; style-src \'unsafe-inline\'; font-src data:;">';
    return `${csp}\n${html}`;
  }
}
