FROM node:24-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0

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

ENV NODE_ENV=development
ENV CI=true

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY patches ./patches
COPY apps/payload/package.json apps/payload/package.json
RUN --mount=type=cache,id=pnpm-store-payload-ci-dev,target=/pnpm/store \
    corepack install && \
    pnpm install --store-dir=/pnpm/store --frozen-lockfile --filter @nmit/payload...
COPY apps/payload apps/payload

EXPOSE 8083

CMD ["payload-runtime", "dev"]

FROM base AS build

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV CI=true

ARG DATABASE_URL=postgresql://payload:payload@localhost:5432/payload
ARG PAYLOAD_SECRET=payload_build_secret
ARG PAYLOAD_LOCALES=en
ARG FEATURE_PAYLOAD_ARTICLES_ENABLED=1
ARG FEATURE_PAYLOAD_PAGES_ENABLED=1
ARG FEATURE_PAYLOAD_HERO_CAROUSELS_ENABLED=1
ARG S3_ENDPOINT=http://localhost:9004
ARG S3_REGION=us-east-1
ARG S3_BUCKET=payload
ARG S3_ACCESS_KEY_ID=payload
ARG S3_SECRET_ACCESS_KEY=payload

ENV DATABASE_URL=${DATABASE_URL}
ENV PAYLOAD_SECRET=${PAYLOAD_SECRET}
ENV PAYLOAD_LOCALES=${PAYLOAD_LOCALES}
ENV FEATURE_PAYLOAD_ARTICLES_ENABLED=${FEATURE_PAYLOAD_ARTICLES_ENABLED}
ENV FEATURE_PAYLOAD_PAGES_ENABLED=${FEATURE_PAYLOAD_PAGES_ENABLED}
ENV FEATURE_PAYLOAD_HERO_CAROUSELS_ENABLED=${FEATURE_PAYLOAD_HERO_CAROUSELS_ENABLED}
ENV S3_ENDPOINT=${S3_ENDPOINT}
ENV S3_REGION=${S3_REGION}
ENV S3_BUCKET=${S3_BUCKET}
ENV S3_ACCESS_KEY_ID=${S3_ACCESS_KEY_ID}
ENV S3_SECRET_ACCESS_KEY=${S3_SECRET_ACCESS_KEY}

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY patches ./patches
COPY apps/payload/package.json apps/payload/package.json
RUN --mount=type=cache,id=pnpm-store-payload,target=/pnpm/store \
    corepack install && \
    pnpm install --store-dir=/pnpm/store --frozen-lockfile --filter @nmit/payload...
COPY apps/payload apps/payload
RUN mkdir -p apps/payload/public
RUN pnpm --filter @nmit/payload run generate:importmap && \
    pnpm --filter @nmit/payload run build && \
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
