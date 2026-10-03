# Hosting the Angular frontend

Build command: `npm run build`. Publish directory: **`dist/client/browser`**. Use Node.js **24.20.0** (pinned in `.nvmrc`) and run `npm ci` to install dependencies. Angular requires at least Node 24.15.0 in the Node 24 series. Use the npm bundled with Node; the project does not force installation of npm 12.

On Cloudflare Pages, set `NODE_VERSION=24.20.0` for Production and Preview, replacing any older Node override, and deploy the updated commit. Remove an explicit `NPM_VERSION=12.0.2` override if configured. A major-only Node pin can select an older release: Node 24.13.1 cannot run the current Angular toolchain. [Cloudflare version settings](https://developers.cloudflare.com/pages/configuration/build-image/#override-default-versions).

Set these public build variables:

- `API_BASE_URL`: HTTPS NestJS API URL, including `/api`.
- `TURNSTILE_SITE_KEY`: public Turnstile site key, configured for the frontend domain.
- `SITE_URL`: canonical frontend HTTPS origin (default `https://email.dsourav.com`).

This is a browser-only single-page app. Only `index.html`, scripts, styles, images, and public text files are deployed. There are no provider dependencies, generated account-page copies, server bundles, or frontend backend processes.

## Routing

Cloudflare Pages and Netlify can use the checked-in `public/_redirects` and `public/_headers`, copied into the build by Angular. Known application URLs serve `/index.html`; account routes have indexing exclusions. Missing public URLs use `404.html`. No SSR runtime plugin is required. Remove a manually installed Angular SSR plugin in the hosting dashboard if one remains.

**Required when migrating an existing Netlify SSR site:** go to **Project configuration → Developer settings → Build plugins**, find **`@netlify/angular-runtime`**, and select **Disable**. Removing the package from this repository does not disable a plugin installed in the dashboard. Keep build command `npm run build` and publish directory `dist/client/browser`, then trigger a new deployment. If the deploy log still lists this plugin with `origin: ui`, it is still enabled in Netlify. An obsolete `dist/client/server` directory can make that plugin attempt SSR and fail with `ENOENT ... server/index.server.html`; adding server files back is not the fix for this browser-only app. [Netlify's removal instructions](https://docs.netlify.com/extend/install-and-use/build-plugins/#remove-a-plugin).

On other static servers, configure equivalent SPA routing for application URLs and preserve real assets. For Nginx, the basic app routing is:

```nginx
location / { try_files $uri $uri/ /index.html; }
```

That generic fallback returns HTTP 200 for unknown paths; Angular displays its not-found page and sets `noindex`. If real HTTP 404s are required, restrict the fallback to known app paths as in `_redirects`, then use `404.html` for other paths. Account routes should also receive `X-Robots-Tag: noindex, nofollow` at the host; the Angular app applies matching metadata after navigation. Hosts that do not read `_headers` need equivalent header configuration.

## API connection

The separate NestJS backend still runs the API, SMTP listener, worker, database, and Redis. Set its `CLIENT_URL` to the frontend origin. Its refresh cookie uses `SameSite=Strict`, so use HTTPS frontend and API custom domains under the same parent domain, such as `email.example.com` and `api.email.example.com`. Unrelated preview domains do not receive that cookie. Verify login, session refresh, and direct mailbox links after deployment.

## Netlify badge

The badge is injected by Netlify outside your source. Disable it under **Project configuration → General → Powered by Netlify badge**, then save. [Official instructions](https://docs.netlify.com/manage/projects/powered-by-netlify-badge/).
