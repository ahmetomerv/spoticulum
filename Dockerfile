FROM node:24.21.0-bookworm-slim AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
ARG VITE_GA
RUN npm run build

FROM node:24.21.0-bookworm-slim AS production
ENV NODE_ENV=production
ENV PORT=8888
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY server/app.js ./app.js
COPY server/src ./src
COPY --from=client-build /app/client/build /app/client/build
USER node
EXPOSE 8888
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "app.js"]
