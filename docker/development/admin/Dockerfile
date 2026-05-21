FROM node:24-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0

RUN apt-get update && apt-get install -y curl --no-install-recommends && \
    rm -rf /var/lib/apt/lists/* && \
    npm i -g corepack@0.34.5 && \
    corepack enable

WORKDIR /var/www

FROM base AS build

ENV CI=true

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY patches ./patches

RUN --mount=type=cache,id=pnpm-store-admin,target=/pnpm/store \
    corepack install && \
    pnpm fetch --store-dir=/pnpm/store --frozen-lockfile

COPY tsconfig.base.json ./
COPY apps/admin ./apps/admin
COPY libs/ui ./libs/ui

RUN --mount=type=cache,id=pnpm-store-admin,target=/pnpm/store \
    pnpm install --store-dir=/pnpm/store --offline --frozen-lockfile --filter=admin... && \
    pnpm --filter=@techsio/ui-kit build && \
    pnpm install --store-dir=/pnpm/store --offline --frozen-lockfile --filter=admin...

ARG VITE_MEDUSA_BACKEND_URL
ENV VITE_MEDUSA_BACKEND_URL=${VITE_MEDUSA_BACKEND_URL}

RUN --mount=type=cache,id=pnpm-store-admin,target=/pnpm/store \
    pnpm --filter=admin build && \
    test -f apps/admin/dist/index.html

FROM caddy:2-alpine AS prod

COPY apps/admin/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /var/www/apps/admin/dist /srv/admin

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:3000/healthz || exit 1

CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
