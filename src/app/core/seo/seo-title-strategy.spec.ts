import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RouterStateSnapshot } from '@angular/router';
import { SeoTitleStrategy } from './seo-title-strategy';
import site from './site-content.json';
import { RUNTIME_SITE_URL } from '../http/runtime-config.generated';

describe('public page SEO', () => {
  let strategy: SeoTitleStrategy;
  let document: Document;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [SeoTitleStrategy] });
    strategy = TestBed.inject(SeoTitleStrategy);
    document = TestBed.inject(DOCUMENT);
    vi.spyOn(strategy, 'buildTitle').mockReturnValue('Account · Email Sandbox');
  });

  afterEach(() => {
    document
      .querySelectorAll(
        '#site-structured-data, link[rel="canonical"], meta[property^="og:"], meta[name^="twitter:"], meta[name="description"], meta[name="robots"]',
      )
      .forEach((node) => node.remove());
    vi.restoreAllMocks();
  });

  function visit(url: string) {
    strategy.updateTitle({ url } as RouterStateSnapshot);
  }

  it('uses clean canonical URLs and the public meta image, without duplicate tags', () => {
    visit('/?campaign=test#pricing');
    visit('/');
    expect(document.title).toBe(site.pages['/'].title);
    expect(document.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      RUNTIME_SITE_URL + '/',
    );
    expect(document.querySelector('meta[property="og:image"]')?.getAttribute('content')).toBe(
      RUNTIME_SITE_URL + site.image.path,
    );
    expect(document.querySelectorAll('meta[property="og:image"]')).toHaveLength(1);
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toMatch(
      /^index, follow/,
    );
  });

  it('keeps structured FAQ content aligned with visible product answers', () => {
    visit('/');
    const graph = JSON.parse(document.querySelector('#site-structured-data')!.textContent!)[
      '@graph'
    ];
    const faq = graph.find((node: Record<string, unknown>) => node['@type'] === 'FAQPage');
    expect(
      faq.mainEntity.map((item: { name: string; acceptedAnswer: { text: string } }) => ({
        question: item.name,
        answer: item.acceptedAnswer.text,
      })),
    ).toEqual(site.faqs);
    expect(
      graph.find((node: Record<string, unknown>) => node['@type'] === 'WebApplication')
        .aggregateRating,
    ).toBeUndefined();
  });

  it('replaces homepage schema with article and breadcrumb schema on the guide', () => {
    visit('/');
    visit('/docs/?ref=test');
    expect(document.title).toBe(site.pages['/docs'].title);
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      RUNTIME_SITE_URL + '/docs',
    );
    const graph = JSON.parse(document.querySelector('#site-structured-data')!.textContent!)[
      '@graph'
    ];
    expect(graph.map((node: Record<string, unknown>) => node['@type'])).toContain('TechArticle');
    expect(graph.map((node: Record<string, unknown>) => node['@type'])).not.toContain('FAQPage');
  });

  it('removes public metadata and prevents indexing after navigation to an account or missing page', () => {
    for (const path of ['/profile', '/mailbox/123/email/456', '/login', '/missing-page']) {
      visit('/');
      visit(path);
      expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(
        'noindex, nofollow',
      );
      expect(document.querySelector('link[rel="canonical"]')).toBeNull();
      expect(document.querySelector('#site-structured-data')).toBeNull();
      expect(document.querySelector('meta[property="og:image"]')).toBeNull();
    }
  });
});
