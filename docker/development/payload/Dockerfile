FROM node:22-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN apt-get update && apt-get install -y curl --no-install-recommends && \
    rm -rf /var/lib/apt/lists/* && \
    npm i -g corepack@0.34.5 && \
    corepack enable && \
    corepack install -g pnpm@10.26.0

WORKDIR /var/www

FROM base AS dev

ENV NODE_ENV=development

EXPOSE 8083

CMD ["sh", "-c", "pnpm --filter payload payload migrate && pnpm --filter=payload run dev --hostname 0.0.0.0 --port 8083"]

FROM base AS ci-dev

ENV NODE_ENV=development

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/payload/package.json apps/payload/package.json
RUN pnpm install --frozen-lockfile --filter payload...
COPY apps/payload apps/payload

EXPOSE 8083

CMD ["sh", "-c", "pnpm --filter payload payload migrate && pnpm --filter=payload run dev --hostname 0.0.0.0 --port 8083"]

FROM base AS build

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

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

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/payload/package.json apps/payload/package.json
RUN pnpm install --frozen-lockfile --filter payload...
COPY apps/payload apps/payload
RUN pnpm --filter=payload run build

FROM base AS prod

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=build /var/www /var/www

EXPOSE 8083

CMD ["sh", "-c", "pnpm --filter payload payload migrate && pnpm --filter=payload run start --hostname 0.0.0.0 --port 8083"]
