# Phone app (Expo, mobile/) built for the web, for the Railway service fisco-phone. Same source as the iOS and Android app;
# talks to the hosted API by default.
FROM node:24-bookworm-slim AS build
# scripts/fonts.sh (npm postinstall) downloads the fonts with curl and unzip
RUN apt-get update && apt-get install -y --no-install-recommends curl unzip ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app/mobile
COPY mobile/package.json mobile/package-lock.json ./
COPY mobile/scripts/ scripts/
RUN npm ci --no-audit --no-fund
COPY mobile/ ./
COPY shared/ /app/shared/
RUN npx expo export --platform web --output-dir /out

FROM caddy:2.10-alpine
COPY --from=build /out /srv
COPY deploy/fisco-phone/Caddyfile /etc/caddy/Caddyfile
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
