FROM node:24-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
# The minimumReleaseAge supply-chain check fetches registry metadata per
# lockfile entry; default fetch budgets abort it on slow networks.
ENV pnpm_config_fetch_timeout=180000
ENV pnpm_config_fetch_retries=5

RUN apt-get update && apt-get install -y curl --no-install-recommends && \
    rm -rf /var/lib/apt/lists/* && \
    npm i -g corepack@0.34.5 && \
    corepack enable

COPY docker/development/payload/payload-runtime.sh /usr/local/bin/payload-runtime
RUN chmod +x /usr/local/bin/payload-runtime

WORKDIR /var/www

FROM base AS dev

ENV NODE_ENV=development
WORKDIR /tmp/corepack
COPY package.json /tmp/corepack/package.json
RUN corepack install && rm -rf /tmp/corepack
WORKDIR /var/www

EXPOSE 8083

CMD ["payload-runtime", "devsafe"]

FROM base AS ci-dev

ARG TARGETPLATFORM

ENV NODE_ENV=development
ENV CI=true

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY patches ./patches
COPY apps/payload/package.json apps/payload/package.json
COPY libs/std/package.json libs/std/package.json
RUN --mount=type=cache,id=quality-v12-payload-pnpm-${TARGETPLATFORM},target=/pnpm/store \
    corepack install && \
    pnpm install --store-dir=/pnpm/store --prefer-offline --frozen-lockfile --ignore-scripts --filter=@nmit/payload...
COPY apps/payload apps/payload
COPY libs/std libs/std
RUN pnpm --filter @techsio/std run build

EXPOSE 8083

CMD ["payload-runtime", "dev"]

FROM base AS build

ARG TARGETPLATFORM

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV CI=true

ARG PAYLOAD_LOCALES=en
ARG FEATURE_PAYLOAD_ARTICLES_ENABLED=1
ARG FEATURE_PAYLOAD_PAGES_ENABLED=1
ARG FEATURE_PAYLOAD_HERO_CAROUSELS_ENABLED=1
ARG S3_ENDPOINT=http://localhost:9004
ARG S3_REGION=us-east-1
ARG S3_BUCKET=payload

ENV PAYLOAD_LOCALES=${PAYLOAD_LOCALES}
ENV FEATURE_PAYLOAD_ARTICLES_ENABLED=${FEATURE_PAYLOAD_ARTICLES_ENABLED}
ENV FEATURE_PAYLOAD_PAGES_ENABLED=${FEATURE_PAYLOAD_PAGES_ENABLED}
ENV FEATURE_PAYLOAD_HERO_CAROUSELS_ENABLED=${FEATURE_PAYLOAD_HERO_CAROUSELS_ENABLED}
ENV S3_ENDPOINT=${S3_ENDPOINT}
ENV S3_REGION=${S3_REGION}
ENV S3_BUCKET=${S3_BUCKET}

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY patches ./patches
COPY apps/payload/package.json apps/payload/package.json
COPY libs/std/package.json libs/std/package.json
RUN --mount=type=cache,id=quality-v12-payload-pnpm-${TARGETPLATFORM},target=/pnpm/store \
    corepack install && \
    # --prod=false: NODE_ENV=production would prune devDependencies, but the
    # @techsio/std build below needs its toolchain (--ignore-scripts skips its
    # prepare build).
    pnpm install --store-dir=/pnpm/store --prefer-offline --frozen-lockfile --ignore-scripts --prod=false --filter=@nmit/payload...
COPY apps/payload apps/payload
COPY libs/std libs/std
RUN mkdir -p apps/payload/public
RUN pnpm --filter @techsio/std run build && \
    DATABASE_URL=postgresql://payload:payload@localhost:5432/payload \
    PAYLOAD_SECRET=payload-build-secret-not-for-runtime \
    S3_ACCESS_KEY_ID=payload-build \
    S3_SECRET_ACCESS_KEY=payload-build \
    pnpm --filter @nmit/payload run generate:importmap && \
    DATABASE_URL=postgresql://payload:payload@localhost:5432/payload \
    PAYLOAD_SECRET=payload-build-secret-not-for-runtime \
    S3_ACCESS_KEY_ID=payload-build \
    S3_SECRET_ACCESS_KEY=payload-build \
    pnpm --filter @nmit/payload... run build && \
    test -f apps/payload/.next/standalone/apps/payload/server.js

FROM node:24-slim AS prod

RUN apt-get update && apt-get install -y curl --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8083
ENV HOSTNAME=0.0.0.0

WORKDIR /app

COPY --from=build --chown=node:node /var/www/apps/payload/.next/standalone ./
COPY --from=build --chown=node:node /var/www/apps/payload/public ./apps/payload/public
COPY --from=build --chown=node:node /var/www/apps/payload/.next/static ./apps/payload/.next/static

USER node

EXPOSE 8083

WORKDIR /app/apps/payload

CMD ["node", "server.js"]
