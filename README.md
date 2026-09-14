# Spoticulum

Spotify collection-image generator built as a TypeScript React SPA with a
TypeScript Express API. The application does not require a database or SSR
framework.

## Runtime and installation

Use Node **24.21.0 LTS** (`.nvmrc`). Both packages require Node 24.21 or newer in
the 24.x line. Node 26 is the Current release line, rather than the LTS target.
The lockfiles were generated with Node's bundled npm **11.19.0**.

```sh
nvm install
nvm use
npm --prefix client ci
npm --prefix server ci
cp server/.env.example server/.env
```

Fill in the Spotify application credentials and a long random `SESSION_SECRET`.
Never put `CLIENT_SECRET`, `SESSION_SECRET`, access tokens, or refresh tokens in
the client environment. Spotify's registered callback must exactly match
`REDIRECTURI`; use `127.0.0.1`, not `localhost`, for a local OAuth callback.

## Development

Start both the API and client after `nvm use`:

```sh
npm run dev
```

Repository-wide commands are also available from the root: `npm run typecheck`,
`npm run lint`, `npm test`, `npm run build`, and `npm run verify`.

Open `http://127.0.0.1:3000`. The API runs on port 8888. Vite also proxies `/api`
to that port. Press `Ctrl+C` to stop both processes. The browser uses same-origin
`/api/login`, `/api/me`, `/api/top/:type`, and `/api/logout` routes; Spotify
tokens stay in the Express session and are never returned in client URLs.
Access tokens are refreshed server-side before expiry. If Spotify rejects both
the access token and its refresh token, the session is cleared and the user is
prompted to reconnect.

The public analytics setting accepts `VITE_GA` or the original `REACT_APP_GA`.
Only this setting is exposed by the Vite compatibility configuration. Analytics
loads only after explicit consent, can be disabled again from the footer, and
does not receive Spotify profile or listening data. Environment variables are
embedded at build time, as they were with CRA. Leave the setting empty to omit
analytics entirely.

## Verification

```sh
npm --prefix client run lint
npm --prefix server run lint
npm --prefix client run typecheck
npm --prefix server run typecheck
npm --prefix client test
npm --prefix server test
npm --prefix client run build
cd client
npx playwright install chromium
npm run test:e2e
```

On a machine with Chrome installed, `PLAYWRIGHT_CHANNEL=chrome npm run test:e2e`
can use that browser instead. Browser tests start temporary servers on ports
3100 and 3101 and cover both Vite development and Express production serving.
Spotify responses are intercepted with fixtures; no real account is required.
The tests verify pagination, both collection types, canvas PNG downloads, modal
controls, mobile layout, and deep links. Live Spotify authorization still needs
an app-specific smoke test using your registered credentials.

```sh
npm --prefix client run format:check
npm --prefix server run format:check
npm --prefix client audit
npm --prefix server audit --omit=dev
```

TypeScript is configured in strict mode for application code, server tests, and
Playwright tests. The server production build is emitted to `server/dist`.

## Production

```sh
npm --prefix client ci
npm --prefix server ci
npm --prefix server run build
npm --prefix server prune --omit=dev
cd server
NODE_ENV=production npm start
```

The server serves `client/build` using an absolute path, independent of its
working directory. `/`, `/collection`, and `/legal` receive the SPA entry page;
unknown `/api` paths remain JSON 404 responses. `/health` is a lightweight health
endpoint. A reverse proxy should terminate HTTPS and route the application and
API under the existing production origin.

An optional multi-stage Dockerfile installs only server production dependencies
in the final image. Build with `docker build -t spoticulum .`, then run it with
your environment supplied at runtime. Build-time analytics can be supplied with
`--build-arg VITE_GA=...`. No deployment is performed by this repository's CI.

For Coolify, deploy the repository with the Dockerfile build pack, repository
root as the base directory, `/Dockerfile` as the Dockerfile location, and `8888`
as the exposed internal port. Set the domain to
`https://spoticulum.ahmeto.com`. Configure `CLIENT_ID`, `CLIENT_SECRET`,
`SESSION_SECRET`, `REDIRECTURI`, and `CLIENT_REDIRECTURI` as runtime variables;
only `VITE_GA`, when used, is a build variable. The image-provided `/health`
check takes precedence over a Coolify-managed health check.

Sessions currently live in one container's memory. Run one replica; deployments
and restarts sign users out. Use a shared session store before enabling multiple
replicas or requiring sessions to survive deployments.
