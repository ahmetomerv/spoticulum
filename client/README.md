# Spoticulum client

TypeScript React 19 single-page application built with Vite. It renders Spotify
collection images in the browser and communicates with the same-origin Express
API; Spotify credentials and tokens never belong in client environment values.

```sh
npm ci
npm start
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

The production bundle is emitted to `build`. `VITE_GA` is the only supported
public build variable and is optional.
