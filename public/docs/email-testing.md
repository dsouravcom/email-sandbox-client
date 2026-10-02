# SMTP email testing with Email Sandbox

> Email Sandbox is an SMTP email testing platform for developers. It captures development and staging messages for inspection instead of relaying them to real recipients.

Canonical guide: https://email.dsourav.com/docs

## What is an SMTP email sandbox?

An SMTP email sandbox captures messages from your development or staging application in a test inbox. It helps you inspect welcome emails, password resets, confirmation links, and other transactional messages before configuring production delivery.

Email Sandbox stores captured messages for inspection instead of relaying them to real recipients. It is a testing tool, not a production email delivery service.

## Connect your application in three steps

The published SMTP endpoint is smtp.email.dsourav.com on port 2525. Use the values shown in your inbox as the source of truth. Credentials are specific to an inbox.

Node.js (Nodemailer), Python (smtplib), PHP mail libraries, Java mail libraries, and Go SMTP clients can use these settings. Match TLS settings to the server configuration shown in your inbox.

1. Create a Free account and verify your email address. Your initial personal organization and inbox are created during account activation.
2. Open your inbox and copy its SMTP host, port, username, and password. Keep credentials in your application's secret or environment configuration, not in public repositories.
3. Replace the mail settings in your development or staging environment with the sandbox settings and send a test message. Use your production mail provider separately for production delivery.

## Inspect captured test emails

Open a captured message to review its sender, recipients, subject, HTML, plain text, and headers. Inspect confirmation links and verification codes as part of your application's test workflow.

Switch the preview between desktop, tablet, and mobile widths to look for layout issues. Browser previews do not reproduce the rendering behavior of every mail client. Attachment names and metadata can be inspected, but attachment file contents are not stored or downloadable.

## Understand plans and usage limits

Free includes 100 test emails per calendar month, 1 email per second, 1 inbox, 1 team seat including the owner, a maximum email size of 5 MB, and 365 days of retention.

Monthly usage resets at the start of the next calendar month in UTC. Deleting messages does not reset usage. Allowances are shared across an organization's inboxes.

Basic, Pro, Team, and Business are listed as coming soon. Only Free is available for self-service signup. There is no public payment or upgrade flow. Subscription changes, when assigned by an operator, apply to the organization and return to Free when their assigned term expires.

## Organizations and team access

An account can create and join multiple organizations. Each organization has separate inboxes, usage limits, membership, and roles.

Owners and administrators can manage inboxes and invite users when the plan has spare seats. Members can inspect, mark, and delete individual emails; viewers can inspect without changing them. Owners manage administrator roles and shared-organization ownership.

Invitations are tied to the invited email address and expire after 7 days by default. Unexpired pending invitations reserve seats. Free's single seat is occupied by its owner, so additional members require an organization with a higher seat allowance.

## Troubleshoot SMTP testing



1. If a connection fails, check the hostname, port, your network's outbound SMTP rules, and the TLS settings shown for the inbox.
2. If authentication fails, confirm the inbox's username and password. Regenerating a password invalidates previous credentials.
3. If sending is rejected, check whether the inbox is paused, the organization's monthly allowance is exhausted, the message exceeds its size limit, or messages arrive faster than the plan's rate.
4. If team access changes, review the user's membership status and the organization's current plan. An expired paid subscription falls back to Free limits.
