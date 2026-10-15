# Spoticulum server

TypeScript Express API for Spotify OAuth, server-side token refresh, profile and
top-listening proxies, logout, and production SPA serving.

Local setup is in the repository README's Quick Start.

```sh
npm ci
npm run dev
npm run typecheck
npm run lint
npm test
npm run build:server
npm start
```

`build:server` emits `dist`; `start` runs `dist/app.js`. See the repository
README's Production section.

Runtime logs are JSON lines on stdout. Set `LOG_LEVEL` to `debug`, `info`
(default), `warn`, `error`, or `silent` to control verbosity. API responses
include an `X-Request-Id` header that matches the request and domain events.
