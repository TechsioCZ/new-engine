FROM node:24-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
ENV NEXT_TELEMETRY_DISABLED=1

RUN apt-get update && apt-get install -y curl --no-install-recommends && \
    rm -rf /var/lib/apt/lists/* && \
    npm i -g corepack@0.34.5 && \
    corepack enable

WORKDIR /var/www

FROM base AS dev
ENV NODE_ENV=development
WORKDIR /tmp/corepack
COPY package.json /tmp/corepack/package.json
RUN corepack install && rm -rf /tmp/corepack
WORKDIR /var/www
CMD ["sh", "-lc", "\
    [ -x apps/herbatika/node_modules/.bin/next ] || CI=true pnpm install --frozen-lockfile --prefer-offline --filter=herbatica...; \
    pnpm --filter=@techsio/storefront-data build; \
    pnpm --filter=@techsio/ui-kit build; \
    pnpm --filter=herbatica exec next dev --hostname 0.0.0.0 --port 3000 \
"]

FROM base AS build
ENV CI=true

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY patches ./patches
COPY apps/herbatika/package.json apps/herbatika/package.json
COPY libs/ui/package.json libs/ui/package.json
COPY libs/storefront-data/package.json libs/storefront-data/package.json

RUN --mount=type=cache,id=pnpm-store-herbatika,target=/pnpm/store \
    corepack install && \
    pnpm --filter=herbatica... fetch --store-dir=/pnpm/store --frozen-lockfile

COPY tsconfig.base.json tsconfig.json nx.json ./
COPY apps/herbatika ./apps/herbatika
COPY libs/ui ./libs/ui
COPY libs/storefront-data ./libs/storefront-data

ARG NEXT_PUBLIC_MEDUSA_BACKEND_URL
ARG NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_STOREFRONT_AUTH_MODE
ARG NEXT_PUBLIC_PACKETA_WIDGET_API_KEY
ARG NEXT_PUBLIC_PACKETA_WIDGET_COUNTRIES
ARG NEXT_PUBLIC_PAYLOAD_BASE_URL

ENV NEXT_PUBLIC_MEDUSA_BACKEND_URL=${NEXT_PUBLIC_MEDUSA_BACKEND_URL}
ENV NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=${NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY}
ENV NEXT_PUBLIC_STOREFRONT_AUTH_MODE=${NEXT_PUBLIC_STOREFRONT_AUTH_MODE}
ENV NEXT_PUBLIC_PACKETA_WIDGET_API_KEY=${NEXT_PUBLIC_PACKETA_WIDGET_API_KEY}
ENV NEXT_PUBLIC_PACKETA_WIDGET_COUNTRIES=${NEXT_PUBLIC_PACKETA_WIDGET_COUNTRIES}
ENV NEXT_PUBLIC_PAYLOAD_BASE_URL=${NEXT_PUBLIC_PAYLOAD_BASE_URL}

RUN --mount=type=cache,id=pnpm-store-herbatika,target=/pnpm/store \
    pnpm install --store-dir=/pnpm/store --prefer-offline --frozen-lockfile --ignore-scripts --filter=herbatica...

RUN pnpm --filter=@techsio/storefront-data build
RUN pnpm --filter=@techsio/ui-kit build

RUN --mount=type=cache,id=next-cache-herbatika,target=/var/www/apps/herbatika/.next/cache \
    pnpm --filter=herbatica exec next build --webpack && \
    test -f apps/herbatika/.next/BUILD_ID

FROM node:24-slim AS prod

RUN apt-get update && apt-get install -y curl --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

WORKDIR /app

COPY --from=build --chown=node:node /var/www/apps/herbatika/.next/standalone ./
COPY --from=build --chown=node:node /var/www/apps/herbatika/public ./apps/herbatika/public
COPY --from=build --chown=node:node /var/www/apps/herbatika/.next/static ./apps/herbatika/.next/static

USER node

EXPOSE 3000

WORKDIR /app/apps/herbatika

CMD ["node", "server.js"]
