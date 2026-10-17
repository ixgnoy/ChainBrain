# FISCO BCOS 3.16.4 (Air, 1 node) with the web3 RPC behind deploy/fisco-node/gateway.mjs. Chain data lives on a volume at /data.
FROM node:24-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates openssl openjdk-17-jre-headless procps uuid-runtime \
 && rm -rf /var/lib/apt/lists/*
ENV FISCO_VERSION=v3.16.4 CONSOLE_VERSION=v3.7.0
WORKDIR /opt/fisco
RUN curl -sfLO https://github.com/FISCO-BCOS/FISCO-BCOS/releases/download/${FISCO_VERSION}/fisco-bcos-linux-x86_64.tar.gz \
 && tar xzf fisco-bcos-linux-x86_64.tar.gz && rm fisco-bcos-linux-x86_64.tar.gz && ./fisco-bcos -v \
 && curl -sfLo build_chain.sh https://raw.githubusercontent.com/FISCO-BCOS/FISCO-BCOS/${FISCO_VERSION}/tools/BcosAirBuilder/build_chain.sh \
 && curl -sfLO https://github.com/FISCO-BCOS/console/releases/download/${CONSOLE_VERSION}/console.tar.gz \
 && tar xzf console.tar.gz && rm console.tar.gz && cp console/conf/config-example.toml console/conf/config.toml
WORKDIR /app
COPY scripts/fisco scripts/fisco
COPY deploy/fisco-node deploy/fisco-node
ENV FISCO_HOME=/data/fisco PORT=8080
EXPOSE 8080
CMD ["bash", "/app/deploy/fisco-node/entrypoint.sh"]
