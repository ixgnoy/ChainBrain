# Web console (static Vite build) for the Railway service fisco-web. Talks to the hosted API by default (HOSTED_API in
# web/src/source/source.ts); set VITE_API_URL at build time to point it elsewhere.
FROM node:24-bookworm-slim AS build
RUN npm i -g pnpm@12.11.2
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server/package.json server/
COPY web/package.json web/
RUN pnpm install --frozen-lockfile --filter web
COPY web/ web/
COPY shared/ shared/
COPY contracts/deployments contracts/deployments
ARG VITE_API_URL
RUN cd web && pnpm build

FROM caddy:2.10-alpine
COPY --from=build /app/web/dist /srv
CMD ["sh", "-c", "caddy file-server --root /srv --listen :${PORT:-8080}"]
