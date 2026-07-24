# Build from the repository root:
# docker build -f apps/payload/Dockerfile .
FROM node:24-slim AS base

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0

RUN npm install --global corepack@0.34.5 && corepack enable

WORKDIR /var/www

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

ENV PAYLOAD_LOCALES=$PAYLOAD_LOCALES
ENV FEATURE_PAYLOAD_ARTICLES_ENABLED=$FEATURE_PAYLOAD_ARTICLES_ENABLED
ENV FEATURE_PAYLOAD_PAGES_ENABLED=$FEATURE_PAYLOAD_PAGES_ENABLED
ENV FEATURE_PAYLOAD_HERO_CAROUSELS_ENABLED=$FEATURE_PAYLOAD_HERO_CAROUSELS_ENABLED
ENV S3_ENDPOINT=$S3_ENDPOINT
ENV S3_REGION=$S3_REGION
ENV S3_BUCKET=$S3_BUCKET

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY patches ./patches
COPY apps/payload/package.json apps/payload/package.json
COPY libs/std/package.json libs/std/package.json
RUN --mount=type=cache,id=quality-v12-payload-pnpm-${TARGETPLATFORM},target=/pnpm/store \
    corepack install && \
    pnpm install --store-dir=/pnpm/store --prefer-offline --frozen-lockfile --ignore-scripts --filter=@nmit/payload...

COPY apps/payload apps/payload
COPY libs/std libs/std
RUN mkdir -p apps/payload/public && \
    pnpm --filter @techsio/std run build && \
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

FROM node:24-slim AS runner

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

WORKDIR /app

COPY --from=build --chown=node:node /var/www/apps/payload/.next/standalone ./
COPY --from=build --chown=node:node /var/www/apps/payload/public ./apps/payload/public
COPY --from=build --chown=node:node /var/www/apps/payload/.next/static ./apps/payload/.next/static

USER node

EXPOSE 3000

WORKDIR /app/apps/payload

CMD ["node", "server.js"]
