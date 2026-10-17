# Wallet API + explorer (ROLE=api) or x402 sellers + facilitator (ROLE=sellers). Contracts compiled here for the ABIs.
FROM ghcr.io/foundry-rs/foundry:v1.8.5 AS contracts
USER root
WORKDIR /c
COPY contracts/ .
RUN forge build

FROM node:24-bookworm-slim
RUN npm i -g pnpm@12.11.2
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server/package.json server/
COPY web/package.json web/
RUN pnpm install --frozen-lockfile --filter chainbrain-server
COPY server/ server/
COPY contracts/deployments contracts/deployments
COPY --from=contracts /c/out contracts/out
COPY deploy/server deploy/server
ENV CHAIN=fisco FACILITATOR=local NODE_ENV=production
CMD ["bash", "/app/deploy/server/start.sh"]
