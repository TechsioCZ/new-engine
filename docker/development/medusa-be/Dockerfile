# syntax=docker/dockerfile:1.7
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

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN node -e "const fs=require('node:fs'); const pkg=JSON.parse(fs.readFileSync('package.json','utf8')); pkg.pnpm={...(pkg.pnpm||{}), supportedArchitectures:{os:['current'], cpu:['current'], libc:['current']}}; fs.writeFileSync('package.json', JSON.stringify(pkg,null,2)+'\n');"

COPY tsconfig.base.json ./
COPY apps/medusa-be ./apps/medusa-be

RUN --mount=type=cache,id=pnpm-store-medusa-ci-dev,target=/tmp/pnpm-store \
    corepack install && \
    npm_config_store_dir=/tmp/pnpm-store \
    pnpm install --store-dir=/tmp/pnpm-store --frozen-lockfile --filter=medusa-be... && \
    rm -rf \
      apps/medusa-be/integration-tests \
      node_modules/.cache \
      node_modules/.pnpm/@biomejs+* \
      node_modules/.pnpm/@jest+* \
      node_modules/.pnpm/@medusajs+test-utils@* \
      node_modules/.pnpm/@nx+* \
      node_modules/.pnpm/@playwright+* \
      node_modules/.pnpm/@swc+jest@* \
      node_modules/.pnpm/@types+jest@* \
      node_modules/.pnpm/jest-* \
      node_modules/.pnpm/jest@* \
      node_modules/.pnpm/nx@* \
      node_modules/.pnpm/playwright@* \
      node_modules/.pnpm/playwright-core@* \
      node_modules/.pnpm/yalc@* && \
    find apps/medusa-be/src -type d -name __tests__ -prune -exec rm -rf {} + && \
    find node_modules -type f \( \
      -name '*.map' -o \
      -name '*.md' -o \
      -name '*.d.ts' -o \
      -name '*.d.mts' -o \
      -name '*.d.cts' \
    \) -delete && \
    find node_modules -type d \( \
      -name test -o \
      -name tests -o \
      -name __tests__ -o \
      -name docs -o \
      -name doc -o \
      -name example -o \
      -name examples -o \
      -name benchmark -o \
      -name benchmarks \
    \) -prune -exec rm -rf {} +

WORKDIR /var/www/apps/medusa-be

CMD ["npm", "run", "start:ci-dev"]

# ============================================
# PROD BUILD STAGE - compiles everything
# ============================================
FROM base AS build

# Prime pnpm store from lockfile so dependency downloads are cached across source-only changes.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN --mount=type=cache,id=pnpm-store-medusa,target=/pnpm/store \
    corepack install && \
    pnpm fetch --store-dir=/pnpm/store --frozen-lockfile

# Copy only the files needed for the Medusa production build so unrelated repo changes
# don't invalidate the expensive install/build layers.
COPY nx.json tsconfig.base.json ./
COPY scripts/build-medusa.sh ./scripts/build-medusa.sh
COPY apps/medusa-be ./apps/medusa-be

# Build using shared script (cleanup, install, build, validate, prod deploy)
ARG FEATURE_PPL_ENABLED=0
RUN --mount=type=cache,id=pnpm-store-medusa,target=/pnpm/store \
    npm_config_store_dir=/pnpm/store \
    FEATURE_PPL_ENABLED=${FEATURE_PPL_ENABLED} \
    ./scripts/build-medusa.sh

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
COPY --from=build --chown=node:node /var/www/medusa-be-prod/node_modules ./node_modules
COPY --from=build --chown=node:node /var/www/apps/medusa-be/src/scripts/seed-files ./src/scripts/seed-files

# Create writable dirs for runtime (types, admin assets, local uploads if used)
RUN mkdir -p /app/.medusa/types /app/.medusa/client /app/static && \
    chown -R node:node /app/.medusa /app/static

# Run as non-root user
USER node

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:9000/health || exit 1

CMD ["sh", "-c", "npm run migrateProd && npm run entrypoint && exec npm run start"]
