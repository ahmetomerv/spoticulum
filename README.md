# Spoticulum

Spoticulum is an open-source Spotify collection-image maker. Connect a Spotify account, choose top artists or top tracks, and download a shareable image assembled in the browser.

The app is built with React 19, Vite, TypeScript, and Express 5. Spotify OAuth tokens stay on the server in an HTTP-only session; the client talks to same-origin `/api/*` routes and never receives Spotify access or refresh tokens.

![Spoticulum screenshot](client/public/screenshot.jpeg)

## Requirements

- Node `24.21.0` from `.nvmrc`
- npm `11.x`
- A Spotify Developer application

## Quick Start

```sh
nvm install
nvm use
npm --prefix client ci
npm --prefix server ci
cp server/.env.example server/.env
```

Create a Spotify app in the
[Spotify Developer Dashboard](https://developer.spotify.com/dashboard) and add
this redirect URI:

```text
http://127.0.0.1:8888/api/logged
```

The callback must be exactly that URL, including `127.0.0.1`.

`server/.env.example` already sets the local URLs. Replace the Spotify
credential placeholders. Every variable is listed in the table below.

```text
REDIRECTURI=http://127.0.0.1:8888/api/logged
CLIENT_REDIRECTURI=http://127.0.0.1:3000/
```

Start the app:

```sh
npm run dev
```

Open `http://127.0.0.1:3000`.

The API runs on `http://127.0.0.1:8888`, and Vite proxies `/api` to it during
development.

## Environment Variables

Server runtime variables:

| Name | Required | Description |
| --- | --- | --- |
| `CLIENT_ID` | Yes | Spotify application client ID. |
| `CLIENT_SECRET` | Yes | Spotify application client secret. Keep this server-side only. |
| `SESSION_SECRET` | Yes | Long random value used to sign session cookies. |
| `REDIRECTURI` | Yes | Spotify OAuth callback URL, for example `http://127.0.0.1:8888/api/logged`. |
| `CLIENT_REDIRECTURI` | Yes | App URL to return users to after OAuth. |
| `PORT` | No | API port. Defaults to `8888`. |
| `COOKIE_SECURE` | No | Set to `true` to force secure cookies outside production. |
| `LOG_LEVEL` | No | Minimum server log level: `debug`, `info` (default), `warn`, `error`, or `silent`. |

Client build variable:

| Name | Required | Description |
| --- | --- | --- |
| `VITE_GA` | No | Optional Google Analytics measurement ID. Analytics remains disabled until the user consents. |

Never put `CLIENT_SECRET`, `SESSION_SECRET`, Spotify access tokens, or Spotify
refresh tokens in client environment variables.

## Scripts

Run these from the repository root:

```sh
npm run dev
npm run typecheck
npm run lint
npm test
npm run build
npm run verify
```

`npm run verify` runs typecheck, lint, tests, format checks, and the production
build. Vitest covers the client, and the Node test runner covers the API.

Install Playwright's Chromium browser before the first end-to-end run:

```sh
cd client
npx playwright install chromium
npm run test:e2e
```

A local end-to-end run compiles the server before the tests start. In CI, the
workflow builds the server first and Playwright only starts `server/dist/app.js`.
The tests use mocked Spotify responses, so they do not require a real Spotify
account.

CI fails on high-severity dependency findings:

```sh
npm --prefix client audit --audit-level=high
npm --prefix server audit --audit-level=high
```

## Production

Build and run locally:

```sh
npm --prefix client ci
npm --prefix server ci
npm --prefix server run build
cd server
NODE_ENV=production npm start
```

In production:

- Serve the app and API from the same HTTPS origin.
- Set `REDIRECTURI` and `CLIENT_REDIRECTURI` to that same origin.
- Add the production `REDIRECTURI` to the Spotify Developer Dashboard.
- Keep `CLIENT_SECRET` and `SESSION_SECRET` as runtime secrets.
- Use one replica unless you add a shared session store; in-memory sessions are
  cleared on restart and are not shared across containers.

The included Dockerfile builds the client and server into a single production
image:

```sh
docker build -t spoticulum .
docker run --env-file server/.env -p 8888:8888 spoticulum
```

The server writes one JSON event per line to stdout. Use the terminal running
`npm run dev` for local logs, or `docker logs <container>` for a container.
API completion events include a request ID, route, status, and duration; the
same ID is returned in the `X-Request-Id` response header. Successful health
checks and static assets are omitted. Logs do not include request URLs, OAuth
codes or state, cookies, Spotify tokens, or Spotify response bodies.

Build-time analytics can be supplied with:

```sh
docker build --build-arg VITE_GA=G-XXXXXXXXXX -t spoticulum .
```

## Security and Privacy Notes

- Spotify tokens stay in the HTTP-only server session.
- CORS only allows the configured app origin and local development origins.
- The generated image is assembled in the browser and is not uploaded by the app.

## License

Spoticulum is released under the [MIT License](LICENSE).
