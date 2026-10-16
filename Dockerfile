# --- Build: client (Vite) + server (TypeScript) ---
FROM node:22-alpine AS build
WORKDIR /app

COPY client/package.json client/package-lock.json client/
RUN npm --prefix client ci
COPY server/package.json server/package-lock.json server/
RUN npm --prefix server ci

COPY client client
COPY server server
RUN npm --prefix client run build && npm --prefix server run build

# --- Runtime: one Node process serving the API and the built client ---
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    PUBLIC_DIR=/app/public \
    CACHE_DIR=/app/cache

COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/server/dist ./dist
COPY --from=build /app/client/dist ./public
RUN mkdir -p /app/cache && chown node:node /app/cache

USER node
EXPOSE 3000
VOLUME ["/app/cache"]
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["node", "dist/index.js"]
