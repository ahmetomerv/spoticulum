# Spoticulum client

TypeScript React 19 application built with Vite. It renders Spotify collection
images in the browser and calls the same-origin Express API.

Setup is in the repository README's Quick Start.

```sh
npm ci
npm start
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

The production bundle is emitted to `build`. `VITE_GA` is the only public build
variable and is optional.
