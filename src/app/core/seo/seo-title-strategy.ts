import { DOCUMENT, inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { RUNTIME_SITE_URL } from '../http/runtime-config.generated';
import site from './site-content.json';

/** The same metadata is rendered at build time and updated during client navigation. */
@Injectable()
export class SeoTitleStrategy extends TitleStrategy {
  private readonly document = inject(DOCUMENT);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const path = snapshot.url.split(/[?#]/)[0].replace(/\/$/, '') || '/';
    const page = site.pages[path as keyof typeof site.pages];
    this.title.setTitle(
      page?.title ?? this.buildTitle(snapshot) ?? 'Page not found · Email Sandbox',
    );
    this.meta.updateTag({
      name: 'description',
      content: page?.description ?? 'Access your Email Sandbox account.',
    });
    this.meta.updateTag({
      name: 'robots',
      content: page
        ? 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
        : 'noindex, nofollow',
    });
    this.document.querySelector('#site-structured-data')?.remove();
    this.document.querySelector('link[rel="canonical"]')?.remove();
    for (const element of this.document.querySelectorAll(
      'meta[property^="og:"], meta[name^="twitter:"]',
    ))
      element.remove();
    if (!page) return;

    const url = RUNTIME_SITE_URL + (path === '/' ? '/' : path);
    const imageUrl = RUNTIME_SITE_URL + site.image.path;
    const canonical = this.document.createElement('link');
    canonical.rel = 'canonical';
    canonical.href = url;
    this.document.head.appendChild(canonical);
    const properties: Record<string, string> = {
      'og:type': 'website',
      'og:site_name': site.name,
      'og:locale': 'en_US',
      'og:title': page.title,
      'og:description': page.description,
      'og:url': url,
      'og:image': imageUrl,
      'og:image:secure_url': imageUrl,
      'og:image:type': 'image/webp',
      'og:image:width': String(site.image.width),
      'og:image:height': String(site.image.height),
      'og:image:alt': site.image.alt,
    };
    for (const [property, content] of Object.entries(properties))
      this.meta.updateTag({ property, content });
    for (const [name, content] of Object.entries({
      'twitter:card': 'summary_large_image',
      'twitter:title': page.title,
      'twitter:description': page.description,
      'twitter:image': imageUrl,
      'twitter:image:alt': site.image.alt,
    }))
      this.meta.updateTag({ name, content });

    const root = RUNTIME_SITE_URL + '/';
    const organization = {
      '@type': 'Organization',
      '@id': root + '#organization',
      name: site.name,
      url: root,
      logo: { '@type': 'ImageObject', url: RUNTIME_SITE_URL + '/logo.svg', width: 200, height: 40 },
    };
    const graph: Record<string, unknown>[] = [
      organization,
      {
        '@type': 'WebSite',
        '@id': root + '#website',
        url: root,
        name: site.name,
        inLanguage: 'en',
        publisher: { '@id': organization['@id'] },
      },
      {
        '@type': 'ImageObject',
        '@id': root + '#meta-image',
        url: imageUrl,
        width: site.image.width,
        height: site.image.height,
        caption: site.image.alt,
      },
      {
        '@type': 'WebPage',
        '@id': url + '#webpage',
        url,
        name: page.title,
        description: page.description,
        inLanguage: 'en',
        isPartOf: { '@id': root + '#website' },
        primaryImageOfPage: { '@id': root + '#meta-image' },
      },
    ];
    if (path === '/') {
      graph.push({
        '@type': 'WebApplication',
        '@id': root + '#application',
        name: site.name,
        url: root,
        description: page.description,
        applicationCategory: 'DeveloperApplication',
        operatingSystem: 'Web browser',
        browserRequirements:
          'Requires a modern web browser and JavaScript for interactive features.',
        image: imageUrl,
        publisher: { '@id': organization['@id'] },
        offers: {
          '@type': 'Offer',
          name: 'Free',
          price: '0',
          priceCurrency: 'USD',
          url: root + '#pricing',
        },
        featureList: [
          'SMTP test email capture',
          'HTML and plain-text inspection',
          'Desktop, tablet, and mobile viewport previews',
          'Message headers and attachment metadata',
          'Organization membership and role management',
        ],
      });
      graph.push({
        '@type': 'FAQPage',
        '@id': root + '#faq',
        mainEntity: site.faqs.map((faq) => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: { '@type': 'Answer', text: faq.answer },
        })),
      });
    } else {
      graph.push({
        '@type': 'TechArticle',
        '@id': url + '#guide',
        headline: page.title,
        description: page.description,
        url,
        inLanguage: 'en',
        author: { '@id': organization['@id'] },
        mainEntityOfPage: { '@id': url + '#webpage' },
      });
      graph.push({
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: site.name, item: root },
          { '@type': 'ListItem', position: 2, name: 'SMTP email testing guide', item: url },
        ],
      });
    }
    const script = this.document.createElement('script');
    script.id = 'site-structured-data';
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': graph,
    }).replace(/</g, '\\u003c');
    this.document.head.appendChild(script);
  }
}
