# Spoticulum server

TypeScript Express API for Spotify OAuth, server-side token refresh, profile and
top-listening proxies, logout, and production SPA serving.

```sh
npm ci
npm run dev
npm run typecheck
npm run lint
npm test
npm run build:server
npm start
```

`build:server` emits `dist`; `start` runs `dist/app.js`. In production, configure
`CLIENT_ID`, `CLIENT_SECRET`, `SESSION_SECRET`, `REDIRECTURI`, and
`CLIENT_REDIRECTURI`. See the repository README for Coolify settings.
