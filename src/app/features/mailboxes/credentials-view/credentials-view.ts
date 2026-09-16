import { Component, computed, inject, input, signal, viewChild } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { firstValueFrom } from 'rxjs';
import { CredentialApi } from '../../../core/mailboxes/credential-api';
import { Mailbox } from '../../../core/mailboxes/mailbox-models';
import { MailboxStore } from '../../../core/mailboxes/mailbox-store';
import { getApiErrorMessage } from '../../../core/http/api-error';
import { Toast } from '../../../core/notifications/toast';
import { CopyButton } from '../../../shared/ui/copy-button/copy-button';
import { ConfirmDialog } from '../../../shared/ui/confirm-dialog/confirm-dialog';

interface RevealedSecret {
  username: string;
  password: string;
}

type CodeLanguage = 'curl' | 'node' | 'python' | 'php';

const LANGUAGES: { id: CodeLanguage; label: string }[] = [
  { id: 'curl', label: 'cURL' },
  { id: 'node', label: 'Node.js' },
  { id: 'python', label: 'Python' },
  { id: 'php', label: 'PHP' },
];

/**
 * The mailbox's SMTP connection info plus ready-to-run code samples — used
 * both inline (the email workspace's default, no-email-selected pane) and
 * inside the "Credentials" dialog, so the two never drift apart.
 *
 * The server only supports SMTP today (mirrored one-for-one from
 * `smtp-server.service.ts`'s `authMethods`/`disabledCommands` config —
 * `PLAIN`/`LOGIN` auth, STARTTLS only when a real certificate is
 * configured); there's no Email/API/POP3 surface to show yet.
 */
@Component({
  selector: 'app-credentials-view',
  imports: [CopyButton, ConfirmDialog, NgIcon],
  templateUrl: './credentials-view.html',
})
export class CredentialsView {
  private readonly credentialApi = inject(CredentialApi);
  private readonly mailboxStore = inject(MailboxStore);
  private readonly toast = inject(Toast);

  readonly mailbox = input.required<Mailbox>();
  /** Set to `false` when an ancestor (e.g. a dialog title) already reads "Credentials". */
  readonly showHeading = input(true);

  protected readonly busy = signal(false);
  protected readonly revealed = signal<RevealedSecret | null>(null);
  protected readonly languages = LANGUAGES;
  protected readonly activeLanguage = signal<CodeLanguage>('curl');

  private readonly regenerateDialog = viewChild.required<ConfirmDialog>('regenerateDialog');

  protected readonly displaySecret = computed<RevealedSecret | null>(() => {
    const revealed = this.revealed();
    if (revealed) return revealed;
    const smtp = this.mailbox().smtp;
    return smtp.password ? { username: smtp.username, password: smtp.password } : null;
  });

  protected readonly snippet = computed(() => {
    const smtp = this.mailbox().smtp;
    const secret = this.displaySecret();
    const username = secret?.username ?? (smtp.username || '<username>');
    const password = secret?.password ?? '<password>';
    return this.buildSnippet(this.activeLanguage(), smtp.host, smtp.port, username, password);
  });

  protected confirmRegenerate(): void {
    this.regenerateDialog().open();
  }

  protected async regenerate(): Promise<void> {
    this.busy.set(true);
    try {
      const credential = await firstValueFrom(this.credentialApi.regenerate(this.mailbox().id));
      const secret = { username: credential.username, password: credential.password! };
      this.revealed.set(secret);
      this.mailboxStore.applyRevealedSecret(this.mailbox().id, secret);
      this.toast.success('SMTP password regenerated. The previous password no longer works.');
    } catch (error) {
      this.toast.error(getApiErrorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  private buildSnippet(language: CodeLanguage, host: string, port: number, user: string, pass: string): string {
    switch (language) {
      case 'curl':
        return [
          'curl \\',
          `  --url 'smtp://${host}:${port}' \\`,
          `  --user '${user}:${pass}' \\`,
          "  --mail-from 'from@example.com' \\",
          "  --mail-rcpt 'to@example.com' \\",
          '  --upload-file -',
        ].join('\n');
      case 'python':
        return [
          'import smtplib',
          'from email.mime.text import MIMEText',
          '',
          "msg = MIMEText('Hello from the sandbox!')",
          "msg['Subject'] = 'Test email'",
          "msg['From'] = 'from@example.com'",
          "msg['To'] = 'to@example.com'",
          '',
          `with smtplib.SMTP('${host}', ${port}) as server:`,
          `    server.login('${user}', '${pass}')`,
          '    server.send_message(msg)',
        ].join('\n');
      case 'php':
        return [
          "$mail = new PHPMailer\\PHPMailer\\PHPMailer();",
          '$mail->isSMTP();',
          `$mail->Host = '${host}';`,
          `$mail->Port = ${port};`,
          '$mail->SMTPAuth = true;',
          `$mail->Username = '${user}';`,
          `$mail->Password = '${pass}';`,
          "$mail->setFrom('from@example.com');",
          "$mail->addAddress('to@example.com');",
          "$mail->Subject = 'Test email';",
          "$mail->Body = 'Hello from the sandbox!';",
          '$mail->send();',
        ].join('\n');
      case 'node':
      default:
        return [
          "const nodemailer = require('nodemailer');",
          '',
          'const transporter = nodemailer.createTransport({',
          `  host: '${host}',`,
          `  port: ${port},`,
          '  secure: false,',
          '  auth: {',
          `    user: '${user}',`,
          `    pass: '${pass}',`,
          '  },',
          '});',
          '',
          'await transporter.sendMail({',
          "  from: 'from@example.com',",
          "  to: 'to@example.com',",
          "  subject: 'Test email',",
          "  text: 'Hello from the sandbox!',",
          '});',
        ].join('\n');
    }
  }
}
