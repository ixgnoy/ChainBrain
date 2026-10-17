# Web console (Railway service `web`): Vite build, served as a static SPA on $PORT. The built-in network (shared/sim) is
# bundled, so the console works with no backend; VITE_API_URL points live mode at a wallet API (default: fisco-api).
FROM node:24-bookworm-slim AS build
RUN npm i -g pnpm@12.11.2
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY web/package.json web/
COPY server/package.json server/
COPY devstack/package.json devstack/
RUN pnpm install --frozen-lockfile --filter web
COPY shared/ shared/
COPY web/ web/
ARG VITE_API_URL=https://fisco-api-production-85c5.up.railway.app
ENV VITE_API_URL=$VITE_API_URL
RUN pnpm --filter web build

FROM node:24-bookworm-slim
RUN npm i -g serve@14.2.4
COPY --from=build /app/web/dist /site
CMD ["sh", "-c", "exec serve -s /site -l tcp://0.0.0.0:${PORT:-8080}"]
