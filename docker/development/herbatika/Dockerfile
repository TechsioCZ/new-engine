FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
ENV NEXT_TELEMETRY_DISABLED=1

RUN apt-get update && apt-get install -y curl --no-install-recommends && \
    rm -rf /var/lib/apt/lists/* && \
    npm i -g corepack@0.34.5 && \
    corepack enable

WORKDIR /var/www

FROM base AS build
ENV CI=true

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY patches ./patches
COPY apps/herbatika/package.json apps/herbatika/package.json
COPY libs/ui/package.json libs/ui/package.json
COPY libs/storefront-data/package.json libs/storefront-data/package.json

RUN --mount=type=cache,id=pnpm-store-herbatika,target=/pnpm/store \
    corepack install && \
    pnpm --filter=herbatika... fetch --store-dir=/pnpm/store --frozen-lockfile

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
ARG MEILISEARCH_HOST
ARG MEILISEARCH_SEARCH_API_KEY
ARG MEILISEARCH_PRODUCTS_INDEX
ARG MEILISEARCH_CATEGORIES_INDEX
ARG MEILISEARCH_PRODUCERS_INDEX

ENV NEXT_PUBLIC_MEDUSA_BACKEND_URL=${NEXT_PUBLIC_MEDUSA_BACKEND_URL}
ENV NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=${NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY}
ENV NEXT_PUBLIC_STOREFRONT_AUTH_MODE=${NEXT_PUBLIC_STOREFRONT_AUTH_MODE}
ENV NEXT_PUBLIC_PACKETA_WIDGET_API_KEY=${NEXT_PUBLIC_PACKETA_WIDGET_API_KEY}
ENV NEXT_PUBLIC_PACKETA_WIDGET_COUNTRIES=${NEXT_PUBLIC_PACKETA_WIDGET_COUNTRIES}
ENV NEXT_PUBLIC_PAYLOAD_BASE_URL=${NEXT_PUBLIC_PAYLOAD_BASE_URL}
ENV MEILISEARCH_HOST=${MEILISEARCH_HOST}
ENV MEILISEARCH_SEARCH_API_KEY=${MEILISEARCH_SEARCH_API_KEY}
ENV MEILISEARCH_PRODUCTS_INDEX=${MEILISEARCH_PRODUCTS_INDEX}
ENV MEILISEARCH_CATEGORIES_INDEX=${MEILISEARCH_CATEGORIES_INDEX}
ENV MEILISEARCH_PRODUCERS_INDEX=${MEILISEARCH_PRODUCERS_INDEX}

RUN --mount=type=cache,id=pnpm-store-herbatika,target=/pnpm/store \
    pnpm install --store-dir=/pnpm/store --prefer-offline --frozen-lockfile --ignore-scripts --filter=herbatika...

RUN pnpm --filter=@techsio/storefront-data build
RUN pnpm --filter=@techsio/ui-kit build

RUN --mount=type=cache,id=next-cache-herbatika,target=/var/www/apps/herbatika/.next/cache \
    pnpm --filter=herbatika exec next build --webpack && \
    test -f apps/herbatika/.next/BUILD_ID

FROM node:22-slim AS prod

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
