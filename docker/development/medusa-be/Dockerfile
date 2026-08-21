FROM node:24-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0

RUN apt-get update && apt-get install -y curl --no-install-recommends && \
    rm -rf /var/lib/apt/lists/* && \
    npm i -g corepack@0.34.5 && \
    corepack enable

WORKDIR /var/www

# ============================================
# DEV TARGET - uses host volume mounts
# ============================================
FROM base AS dev
ENV NODE_ENV=development
ENV DATABASE_TYPE=postgres
WORKDIR /tmp/corepack
COPY package.json /tmp/corepack/package.json
RUN corepack install && rm -rf /tmp/corepack
WORKDIR /var/www
CMD ["pnpm", "--filter", "medusa-be", "dev"]
#CMD ["sh", "-c", "pnpm --filter medusa-be migrate && pnpm --filter medusa-be entrypoint && pnpm --filter medusa-be dev"]
#CMD ["tail", "-f", "/dev/null"]

# ============================================
# CI DEV TARGET - non-interactive preview runtime
# ============================================
FROM base AS ci-dev
ENV NODE_ENV=development
ENV DATABASE_TYPE=postgres
ENV CI=true

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY patches ./patches
RUN corepack install

COPY tsconfig.base.json eslint.config.ts ./
COPY libs/storefront-i18n ./libs/storefront-i18n
COPY apps/medusa-be ./apps/medusa-be
COPY apps/medusa-symmy-plugin ./apps/medusa-symmy-plugin
COPY apps/medusa-order-dashboard-plugin ./apps/medusa-order-dashboard-plugin

RUN --mount=type=cache,id=pnpm-store-medusa,target=/pnpm/store \
    pnpm_config_store_dir=/pnpm/store \
    pnpm install --store-dir=/pnpm/store --prefer-offline --frozen-lockfile --filter=medusa-be...

WORKDIR /var/www/apps/medusa-be

CMD ["npm", "run", "start:ci-dev"]

# ============================================
# PROD BUILD STAGE - compiles everything
# ============================================
FROM base AS build
ENV CI=true

# Pin pnpm before copying the narrowed service source.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY patches ./patches
RUN corepack install

# Copy only the files needed for the Medusa production build so unrelated repo changes
# don't invalidate the expensive install/build layers.
COPY nx.json tsconfig.base.json eslint.config.ts ./
COPY scripts/build-medusa.sh ./scripts/build-medusa.sh
COPY libs/storefront-i18n ./libs/storefront-i18n
COPY apps/medusa-be ./apps/medusa-be
COPY apps/medusa-symmy-plugin ./apps/medusa-symmy-plugin
COPY apps/medusa-order-dashboard-plugin ./apps/medusa-order-dashboard-plugin

# Build using shared script (cleanup, install, build, validate, prod deploy)
ARG FEATURE_PPL_ENABLED=0
ARG FEATURE_PAYLOAD_ENABLED=0
ARG FEATURE_PACKETA_ENABLED=0
ARG FEATURE_GLS_ENABLED=1
RUN --mount=type=cache,id=pnpm-store-medusa,target=/pnpm/store \
    pnpm_config_store_dir=/pnpm/store \
    pnpm_config_prefer_offline=true \
    FEATURE_PPL_ENABLED=${FEATURE_PPL_ENABLED} \
    FEATURE_PAYLOAD_ENABLED=${FEATURE_PAYLOAD_ENABLED} \
    FEATURE_PACKETA_ENABLED=${FEATURE_PACKETA_ENABLED} \
    FEATURE_GLS_ENABLED=${FEATURE_GLS_ENABLED} \
    ./scripts/build-medusa.sh

# Zane's registry ingress rejects a single oversized OCI blob. Keep the exact
# pnpm deployment intact, but distribute its content across deterministic
# layers so no individual upload contains the complete production dependency
# graph.
RUN /bin/bash -euo pipefail -c '\
    node_modules=/var/www/medusa-be-prod/node_modules; \
    split_root=/var/www/medusa-node-modules; \
    mkdir -p "$split_root/root" "$split_root/chunks"; \
    for bucket in $(seq -w 0 31); do mkdir -p "$split_root/chunks/$bucket"; done; \
    find "$node_modules" -mindepth 1 -maxdepth 1 ! -name .pnpm \
      -exec mv -- {} "$split_root/root/" \;; \
    while IFS= read -r -d "" entry; do \
      name=${entry##*/}; \
      prefix=$(printf "%s" "$name" | sha256sum | cut -c1-2); \
      bucket=$(printf "%02d" $((16#$prefix % 32))); \
      mv -- "$entry" "$split_root/chunks/$bucket/"; \
    done < <(find "$node_modules/.pnpm" -mindepth 1 -maxdepth 1 -print0 | sort -z); \
    test -z "$(find "$node_modules/.pnpm" -mindepth 1 -maxdepth 1 -print -quit)"; \
    test -n "$(find "$split_root/root" -mindepth 1 -maxdepth 1 -print -quit)"'

# ============================================
# PROD RUNTIME - minimal final image
# ============================================
FROM node:24-slim AS prod

# curl needed for healthcheck
RUN apt-get update && apt-get install -y curl --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV DATABASE_TYPE=postgres

WORKDIR /app

# Copy files with node user ownership (UID 1000, comes with node image)
COPY --from=build --chown=node:node /var/www/apps/medusa-be/.medusa/server ./
COPY --from=build --chown=node:node /var/www/medusa-node-modules/root/. ./node_modules/
COPY --from=build --chown=node:node /var/www/medusa-node-modules/chunks/00/. ./node_modules/.pnpm/
COPY --from=build --chown=node:node /var/www/medusa-node-modules/chunks/01/. ./node_modules/.pnpm/
COPY --from=build --chown=node:node /var/www/medusa-node-modules/chunks/02/. ./node_modules/.pnpm/
COPY --from=build --chown=node:node /var/www/medusa-node-modules/chunks/03/. ./node_modules/.pnpm/
COPY --from=build --chown=node:node /var/www/medusa-node-modules/chunks/04/. ./node_modules/.pnpm/
COPY --from=build --chown=node:node /var/www/medusa-node-modules/chunks/05/. ./node_modules/.pnpm/
COPY --from=build --chown=node:node /var/www/medusa-node-modules/chunks/06/. ./node_modules/.pnpm/
COPY --from=build --chown=node:node /var/www/medusa-node-modules/chunks/07/. ./node_modules/.pnpm/
COPY --from=build --chown=node:node /var/www/medusa-node-modules/chunks/08/. ./node_modules/.pnpm/
COPY --from=build --chown=node:node /var/www/medusa-node-modules/chunks/09/. ./node_modules/.pnpm/
COPY --from=build --chown=node:node /var/www/medusa-node-modules/chunks/10/. ./node_modules/.pnpm/
COPY --from=build --chown=node:node /var/www/medusa-node-modules/chunks/11/. ./node_modules/.pnpm/
COPY --from=build --chown=node:node /var/www/medusa-node-modules/chunks/12/. ./node_modules/.pnpm/
COPY --from=build --chown=node:node /var/www/medusa-node-modules/chunks/13/. ./node_modules/.pnpm/
COPY --from=build --chown=node:node /var/www/medusa-node-modules/chunks/14/. ./node_modules/.pnpm/
COPY --from=build --chown=node:node /var/www/medusa-node-modules/chunks/15/. ./node_modules/.pnpm/
COPY --from=build --chown=node:node /var/www/medusa-node-modules/chunks/16/. ./node_modules/.pnpm/
COPY --from=build --chown=node:node /var/www/medusa-node-modules/chunks/17/. ./node_modules/.pnpm/
COPY --from=build --chown=node:node /var/www/medusa-node-modules/chunks/18/. ./node_modules/.pnpm/
COPY --from=build --chown=node:node /var/www/medusa-node-modules/chunks/19/. ./node_modules/.pnpm/
COPY --from=build --chown=node:node /var/www/medusa-node-modules/chunks/20/. ./node_modules/.pnpm/
COPY --from=build --chown=node:node /var/www/medusa-node-modules/chunks/21/. ./node_modules/.pnpm/
COPY --from=build --chown=node:node /var/www/medusa-node-modules/chunks/22/. ./node_modules/.pnpm/
COPY --from=build --chown=node:node /var/www/medusa-node-modules/chunks/23/. ./node_modules/.pnpm/
COPY --from=build --chown=node:node /var/www/medusa-node-modules/chunks/24/. ./node_modules/.pnpm/
COPY --from=build --chown=node:node /var/www/medusa-node-modules/chunks/25/. ./node_modules/.pnpm/
COPY --from=build --chown=node:node /var/www/medusa-node-modules/chunks/26/. ./node_modules/.pnpm/
COPY --from=build --chown=node:node /var/www/medusa-node-modules/chunks/27/. ./node_modules/.pnpm/
COPY --from=build --chown=node:node /var/www/medusa-node-modules/chunks/28/. ./node_modules/.pnpm/
COPY --from=build --chown=node:node /var/www/medusa-node-modules/chunks/29/. ./node_modules/.pnpm/
COPY --from=build --chown=node:node /var/www/medusa-node-modules/chunks/30/. ./node_modules/.pnpm/
COPY --from=build --chown=node:node /var/www/medusa-node-modules/chunks/31/. ./node_modules/.pnpm/
COPY --from=build --chown=node:node /var/www/apps/medusa-be/src/scripts/seed-files ./src/scripts/seed-files

# Create writable dirs for runtime (types, admin assets, local uploads if used)
RUN mkdir -p /app/.medusa/types /app/.medusa/client /app/static && \
    chown -R node:node /app/.medusa /app/static

# Run as non-root user
USER node

HEALTHCHECK --interval=15s --timeout=10s --start-period=120s --retries=8 \
    CMD curl -f http://localhost:9000/health || exit 1

CMD ["sh", "-c", "npm run migrateProd && npm run entrypoint && exec npm run start"]
