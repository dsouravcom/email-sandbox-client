# Hosting the Angular frontend

Build command: `npm run build`. Publish directory: **`dist/client/browser`**. Use Node.js 24 and run `npm ci` to install dependencies.

Set these public build variables:

- `API_BASE_URL`: HTTPS NestJS API URL, including `/api`.
- `TURNSTILE_SITE_KEY`: public Turnstile site key, configured for the frontend domain.
- `SITE_URL`: canonical frontend HTTPS origin (default `https://email.dsourav.com`).

This is a browser-only single-page app. Only `index.html`, scripts, styles, images, and public text files are deployed. There are no provider dependencies, generated account-page copies, server bundles, or frontend backend processes.

## Routing

Cloudflare Pages and Netlify can use the checked-in `public/_redirects` and `public/_headers`, copied into the build by Angular. Known application URLs serve `/index.html`; account routes have indexing exclusions. Missing public URLs use `404.html`. No SSR runtime plugin is required. Remove a manually installed Angular SSR plugin in the hosting dashboard if one remains.

On other static servers, configure equivalent SPA routing for application URLs and preserve real assets. For Nginx, the basic app routing is:

```nginx
location / { try_files $uri $uri/ /index.html; }
```

That generic fallback returns HTTP 200 for unknown paths; Angular displays its not-found page and sets `noindex`. If real HTTP 404s are required, restrict the fallback to known app paths as in `_redirects`, then use `404.html` for other paths. Account routes should also receive `X-Robots-Tag: noindex, nofollow` at the host; the Angular app applies matching metadata after navigation. Hosts that do not read `_headers` need equivalent header configuration.

## API connection

The separate NestJS backend still runs the API, SMTP listener, worker, database, and Redis. Set its `CLIENT_URL` to the frontend origin. Its refresh cookie uses `SameSite=Strict`, so use HTTPS frontend and API custom domains under the same parent domain, such as `email.example.com` and `api.email.example.com`. Unrelated preview domains do not receive that cookie. Verify login, session refresh, and direct mailbox links after deployment.

## Netlify badge

The badge is injected by Netlify outside your source. Disable it under **Project configuration → General → Powered by Netlify badge**, then save. [Official instructions](https://docs.netlify.com/manage/projects/powered-by-netlify-badge/).
