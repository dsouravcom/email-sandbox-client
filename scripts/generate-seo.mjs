import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

try {
  process.loadEnvFile();
} catch {
  /* Hosts can inject environment variables directly. */
}
const site = JSON.parse(
  readFileSync(new URL('../src/app/core/seo/site-content.json', import.meta.url), 'utf8'),
);
const parsed = new URL(process.env.SITE_URL || site.origin);
if (
  parsed.protocol !== 'https:' ||
  parsed.pathname !== '/' ||
  parsed.search ||
  parsed.hash ||
  parsed.username ||
  parsed.password
)
  throw new Error('SITE_URL must be an HTTPS origin without a path, query, or credentials.');
const origin = parsed.origin;
const publicDir = new URL('../public/', import.meta.url);
mkdirSync(new URL('docs/', publicDir), { recursive: true });
const write = (name, content) => writeFileSync(new URL(name, publicDir), content, 'utf8');
const escapeXml = (value) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character],
  );

// Sharing crawlers can read these tags without JavaScript. Route-specific metadata
// is updated by Angular in the browser; there is no server rendering step.
const page = site.pages['/'];
const initialHead = [
  `<title>${escapeXml(page.title)}</title>`,
  `<meta name="description" content="${escapeXml(page.description)}">`,
  '<meta name="robots" content="index, follow, max-image-preview:large">',
  ...Object.entries({
    'og:type': 'website',
    'og:site_name': site.name,
    'og:title': page.title,
    'og:description': page.description,
    'og:image': origin + site.image.path,
    'og:image:alt': site.image.alt,
  }).map(([property, content]) => `<meta property="${property}" content="${escapeXml(content)}">`),
  '<meta name="twitter:card" content="summary_large_image">',
  `<meta name="twitter:title" content="${escapeXml(page.title)}">`,
  `<meta name="twitter:description" content="${escapeXml(page.description)}">`,
  `<meta name="twitter:image" content="${escapeXml(origin + site.image.path)}">`,
]
  .map((tag) => '  ' + tag)
  .join('\n');
const indexFile = new URL('../src/index.html', import.meta.url);
const index = readFileSync(indexFile, 'utf8');
const headMarker = /<!-- PUBLIC_SEO_START -->[\s\S]*?<!-- PUBLIC_SEO_END -->/;
if (!headMarker.test(index)) throw new Error('Missing public SEO markers in src/index.html.');
writeFileSync(
  indexFile,
  index.replace(
    headMarker,
    '<!-- PUBLIC_SEO_START -->\n' + initialHead + '\n  <!-- PUBLIC_SEO_END -->',
  ),
);

write(
  'sitemap.xml',
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    Object.keys(site.pages)
      .map((path) => `  <url><loc>${escapeXml(origin + path)}</loc></url>`)
      .join('\n') +
    '\n</urlset>\n',
);
write(
  'robots.txt',
  `# Public content is available to search and AI crawlers that respect robots.txt.\n# The wildcard policy also applies to AI search and training crawlers.\n# Authentication protects account and inbox data.\n# Allow account HTML shells to be crawled so their noindex directives are visible.\nUser-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${origin}/sitemap.xml\n`,
);

const summary =
  'Email Sandbox is an SMTP email testing platform for developers. It captures development and staging messages for inspection instead of relaying them to real recipients.';
const guide =
  `# SMTP email testing with ${site.name}\n\n> ${summary}\n\nCanonical guide: ${origin}/docs\n\n` +
  site.guide
    .map(
      (section) =>
        `## ${section.title}\n\n${(section.paragraphs || []).join('\n\n')}${section.steps ? '\n\n' + section.steps.map((step, index) => `${index + 1}. ${step}`).join('\n') : ''}`,
    )
    .join('\n\n') +
  '\n';
write('docs/email-testing.md', guide);
const planTable =
  '| Plan | Signup availability | Emails/second | Emails/month | Inboxes | Team seats | Email size | Retention |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n' +
  site.plans
    .map(
      ({ name, available, limits }) =>
        `| ${name} | ${available ? 'Free signup available' : 'Coming soon; no self-service upgrades'} | ${limits.emailsPerSecond} | ${limits.emailsPerMonth} | ${limits.maxMailboxes} | ${limits.maxTeamMembers} | ${limits.maxEmailSizeMb} MB | ${limits.retentionDays === null ? 'Unlimited' : limits.retentionDays + ' days'} |`,
    )
    .join('\n');
write(
  'llms.txt',
  `# ${site.name}\n\n> ${summary}\n\nFree is the only plan available for self-service signup. Other plans are coming soon. This is an email testing sandbox, not a production email delivery service. Only public product information is included; no account data, captured emails, or credentials are published.\n\n## Product\n\n- [Product overview](${origin}/): Features, interactive demo, plan allowances, and frequently asked questions.\n- [SMTP email testing guide](${origin}/docs): Account activation, SMTP configuration, message inspection, organization roles, and troubleshooting.\n\n## Text resources\n\n- [SMTP guide in Markdown](${origin}/docs/email-testing.md): The public guide in plain Markdown.\n- [Full product context](${origin}/llms-full.txt): Product facts, plan limits, guide, and FAQ in one text file.\n\n## Optional\n\n- [Sitemap](${origin}/sitemap.xml): Canonical, indexable public HTML pages.\n`,
);
write(
  'llms-full.txt',
  `# ${site.name}\n\n> ${summary}\n\nCanonical website: ${origin}/\n\n## Product scope\n\nSupports SMTP capture, HTML and plain-text inspection, headers, attachment metadata, viewport previews, and organization access management. Browser previews are not simulations of every email client. Attachment file contents are discarded on all plans. Only Free signup is currently available.\n\n## Plan allowances\n\n${planTable}\n\nAllowances are shared within an organization. Monthly usage resets at the start of each UTC calendar month. Deleting emails does not restore allowance. There is no payment gateway or self-service upgrade flow.\n\n${guide}\n## Frequently asked questions\n\n${site.faqs.map((faq) => `### ${faq.question}\n\n${faq.answer}`).join('\n\n')}\n`,
);
if (!readFileSync(new URL(site.image.path.slice(1), publicDir)).length)
  throw new Error('The configured social image is empty.');
console.log(
  `Generated SEO files for ${origin} using ${fileURLToPath(new URL(site.image.path.slice(1), publicDir))}.`,
);
