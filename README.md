# Email Sandbox frontend

A browser-only Angular application. UI components, routing, forms, local state, and API clients live here. Authentication, authorization, plan enforcement, SMTP handling, and persistence live in the separate NestJS server.

## Development

Use Node.js 24 (`.nvmrc`), run `npm ci`, and copy `.env.example` to `.env`. Set the public API URL and Turnstile site key, then run:

```sh
npm start
npm test -- --watch=false
npm run build
```

The build outputs `dist/client/browser`. There is no SSR, prerendering, hydration, Express server, edge handler, or provider runtime. Dependencies are standard Angular browser libraries and frontend build/test tools.

## Configuration and SEO

The small build scripts read public environment variables and generate metadata/crawler text. They are build tools, not deployed servers. Edit `src/app/core/seo/site-content.json` for public product facts, plans, FAQ, and page metadata. `SITE_URL` sets the canonical HTTPS origin.

Public pages render in the browser. Page titles, descriptions, canonicals, and JSON-LD update on navigation. The initial HTML includes generic sharing tags using `public/meta-image.webp`; robots.txt, sitemap.xml, and LLM text resources remain static assets. Crawlers need JavaScript for full page content.

See [hosting setup](HOSTING.md) for direct-link routing and API domain configuration. Keep frontend API models consistent with the NestJS responses when changing features.
