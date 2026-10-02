import { afterNextRender, Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { NgIcon } from '@ng-icons/core';
import { AuthStore } from '../../../core/auth/auth-store';
import { CopyButton } from '../../../shared/ui/copy-button/copy-button';
import { ThemeSwitcher } from '../../../layout/theme-switcher/theme-switcher';
import { AppLogo } from '../../../shared/ui/logo/logo';
import site from '../../../core/seo/site-content.json';

export interface DemoEmail {
  id: string;
  sender: string;
  from: string;
  to: string;
  subject: string;
  dateStr: string;
  fullDateStr: string;
  snippet: string;
  read: boolean;
  textBody: string;
  htmlBody: string;
}

export type DeviceMode = 'desktop' | 'tablet' | 'mobile';
export type HeroCodeTab = 'node' | 'curl' | 'python' | 'java' | 'go' | 'php';

@Component({
  selector: 'app-landing-page',
  imports: [RouterLink, NgIcon, CopyButton, ThemeSwitcher, AppLogo, DecimalPipe],
  templateUrl: './landing-page.html',
})
export class LandingPage {
  private readonly sanitizer = inject(DomSanitizer);
  protected readonly auth = inject(AuthStore);
  /** Static marketing content, editable in site-content.json. */
  protected readonly plans = site.plans;
  protected readonly faqs = site.faqs;
  protected readonly navigationReady = signal(false);

  constructor() { afterNextRender(() => this.navigationReady.set(true)); }

  // Hero code snippet active tab
  protected readonly heroCodeTab = signal<HeroCodeTab>('node');

  // Interactive Simulator States
  protected readonly selectedEmailId = signal<string>('email-acme-welcome');
  protected readonly deviceMode = signal<DeviceMode>('desktop');
  protected readonly contentTab = signal<'html' | 'text'>('html');
  protected readonly isSimulating = signal(false);
  protected readonly simulatedStatus = signal<string | null>(null);

  // FAQ open item
  protected readonly openFaqIndex = signal<number | null>(0);

  // Exact credentials requested by user
  protected readonly heroSnippets: Record<HeroCodeTab, { label: string; code: string }> = {
    node: {
      label: 'Node.js',
      code: `// Node.js (Nodemailer)
host: 'smtp.email.dsourav.com',
port: 2525,
auth: {
  user: 'your_username',
  pass: '**************',
}`,
    },
    curl: {
      label: 'cURL',
      code: `curl --url 'smtp://smtp.email.dsourav.com:2525' \\
  --user 'your_username:**************' \\
  --mail-from 'sender@example.com' \\
  --mail-rcpt 'recipient@example.com' \\
  --upload-file email.txt`,
    },
    python: {
      label: 'Python',
      code: `# Python (smtplib)
server = smtplib.SMTP('smtp.email.dsourav.com', 2525)
server.login('your_username', '**************')
server.sendmail(sender, recipient, message.as_string())`,
    },
    java: {
      label: 'Java',
      code: `// JavaMail Properties
props.put("mail.smtp.host", "smtp.email.dsourav.com");
props.put("mail.smtp.port", "2525");
props.put("mail.smtp.auth", "true");
// user: "your_username", pass: "**************"`,
    },
    go: {
      label: 'Go',
      code: `// Go (net/smtp)
auth := smtp.PlainAuth("", "your_username", "**************", "smtp.email.dsourav.com")
err := smtp.SendMail("smtp.email.dsourav.com:2525", auth, from, to, msg)`,
    },
    php: {
      label: 'PHP',
      code: `// Laravel .env or PHPMailer
MAIL_MAILER=smtp
MAIL_HOST=smtp.email.dsourav.com
MAIL_PORT=2525
MAIL_USERNAME=your_username
MAIL_PASSWORD=**************`,
    },
  };

  protected readonly activeHeroSnippet = computed(() => {
    return this.heroSnippets[this.heroCodeTab()];
  });

  // Fictional sample messages for the local simulator.
  protected readonly emails = signal<DemoEmail[]>([
    {
      id: 'email-acme-welcome',
      sender: 'Acme',
      from: 'Acme <hello@acme.example>',
      to: 'alex@example.com',
      subject: 'Confirm your email for Acme',
      dateStr: '9/30/26, 12:19 PM',
      fullDateStr: 'Sep 30, 2026, 12:19:57 PM',
      snippet: 'Confirm your email address Thanks for signing up for Acme. Confirm your email...',
      read: true,
      textBody: `Acme

Confirm your email address

Thanks for signing up for Acme. Confirm this is your email address to finish creating your account.

Confirm email address link:
https://app.acme.example/verify-email?token=demo-token

This link works for 72 hours. If you didn't create an account, you can ignore this email.

This email was sent by Acme. Please don't reply to it.`,
      htmlBody: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 40px 32px; color: #1e293b; background: #ffffff; border-radius: 16px;">
          <div style="text-align: center; margin-bottom: 28px;">
            <span style="font-size: 15px; font-weight: 600; color: #334155; letter-spacing: -0.2px;">Acme</span>
          </div>

          <h3 style="font-size: 24px; font-weight: 700; color: #0f172a; margin: 0 0 16px; text-align: left; letter-spacing: -0.4px;">
            Confirm your email address
          </h3>

          <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 28px;">
            Thanks for signing up for Acme. Confirm this is your email address to finish creating your account.
          </p>

          <div style="margin: 0 0 32px;">
            <a href="#demo" style="display: inline-block; background: #18181b; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600;">
              Confirm email address
            </a>
          </div>

          <div style="border-top: 1px solid #f1f5f9; padding-top: 24px; margin-top: 24px; font-size: 12px; color: #64748b; line-height: 1.6;">
            <p style="margin: 0 0 8px;">If the button doesn't work, copy this link into your browser:</p>
            <p style="margin: 0 0 16px; word-break: break-all; color: #475569; font-family: monospace; font-size: 11px; background: #f8fafc; padding: 8px; border-radius: 6px;">
              https://app.acme.example/verify-email?token=demo-token
            </p>
            <p style="margin: 0 0 20px;">This link works for 72 hours. If you didn't create an account, you can ignore this email.</p>
          </div>

          <div style="text-align: center; font-size: 12px; color: #94a3b8; padding-top: 12px; border-top: 1px solid #f8fafc;">
            This email was sent by Acme. Please don't reply to it.
          </div>
        </div>
      `,
    },
    {
      id: 'email-smtp-test',
      sender: 'Acme Notifications',
      from: 'Acme Notifications <notifications@acme.example>',
      to: 'alex@example.com',
      subject: 'Your Acme test email',
      dateStr: '9/17/26, 4:57 PM',
      fullDateStr: 'Sep 17, 2026, 4:57:00 PM',
      snippet: 'This is a test email sent from Node.js using SMTP.',
      read: true,
      textBody: `Your Acme test email

This is a test email sent from Node.js using SMTP.

Your sandbox mailbox is working and capturing all outgoing email safely without sending to real recipients.`,
      htmlBody: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 36px 30px; color: #1e293b; background: #ffffff; border-radius: 16px;">
          <h2 style="font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 14px;">
            Your Acme test email
          </h2>
          <p style="font-size: 14px; line-height: 1.6; color: #334155; margin-bottom: 20px;">
            This is a test email sent from Node.js using SMTP.
          </p>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; font-size: 13px; color: #475569;">
            Everything is working properly. Outgoing delivery is safely captured in your sandbox inbox.
          </div>
        </div>
      `,
    },
  ]);

  // Selected email
  protected readonly selectedEmail = computed<DemoEmail>(() => {
    const list = this.emails();
    const id = this.selectedEmailId();
    return list.find((e) => e.id === id) || list[0];
  });

  // Sanitized safe HTML for preview
  protected readonly safeHtmlContent = computed<SafeHtml>(() => {
    return this.sanitizer.bypassSecurityTrustHtml(this.selectedEmail().htmlBody);
  });

  // Frame width class for responsive device modes
  protected readonly deviceFrameClass = computed(() => {
    switch (this.deviceMode()) {
      case 'mobile':
        return 'max-w-[360px] mx-auto shadow-2xl ring-8 ring-neutral/25 rounded-[32px] overflow-hidden transition-all duration-300';
      case 'tablet':
        return 'max-w-[580px] mx-auto shadow-xl ring-6 ring-neutral/15 rounded-[22px] overflow-hidden transition-all duration-300';
      case 'desktop':
      default:
        return 'w-full shadow-xs rounded-xl overflow-hidden transition-all duration-300';
    }
  });

  // Select email in list
  protected selectEmail(id: string): void {
    this.selectedEmailId.set(id);
    this.emails.update((list) =>
      list.map((e) => (e.id === id ? { ...e, read: true } : e)),
    );
  }

  // Action: Simulate a new incoming email
  protected simulateSend(): void {
    if (this.isSimulating()) return;
    this.isSimulating.set(true);

    const newId = 'sim-' + Date.now();
    const newEmail: DemoEmail = {
      id: newId,
      sender: 'Acme',
      from: 'Acme <hello@acme.example>',
      to: 'alex@example.com',
      subject: 'Security Alert: New Sign-in Detected',
      dateStr: 'Just now',
      fullDateStr: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ', ' + new Date().toLocaleTimeString(),
      snippet: 'A new sign-in was detected for your account from Chrome on macOS...',
      read: false,
      textBody: `Acme Security Alert

A new sign-in was detected for your account from Chrome on macOS.

If this was you, you can ignore this email. If you did not sign in recently, please secure your account immediately.`,
      htmlBody: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 36px 30px; color: #1e293b; background: #ffffff; border-radius: 16px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <span style="font-size: 15px; font-weight: 600; color: #334155;">Acme</span>
          </div>
          <h2 style="font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 12px;">
            New sign-in detected
          </h2>
          <p style="font-size: 14px; line-height: 1.6; color: #334155; margin-bottom: 20px;">
            A new sign-in was detected for <strong>alex&#64;example.com</strong> from Chrome on macOS.
          </p>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; font-size: 13px; color: #475569; margin-bottom: 24px;">
            Captured safely in your sandbox. No email was sent to real recipients.
          </div>
          <a href="#demo" style="display: inline-block; background: #18181b; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-size: 13px; font-weight: 600;">
            Review Account Activity
          </a>
        </div>
      `,
    };

    this.emails.update((current) => [newEmail, ...current]);
    this.selectedEmailId.set(newId);
    this.simulatedStatus.set('Sample email added to the demo inbox.');

    setTimeout(() => {
      this.isSimulating.set(false);
    }, 400);

    setTimeout(() => {
      this.simulatedStatus.set(null);
    }, 4500);
  }

  // Toggle FAQ accordion item
  protected toggleFaq(index: number): void {
    this.openFaqIndex.update((current) => (current === index ? null : index));
  }
}
