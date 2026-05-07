FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0

RUN apt-get update && apt-get install -y curl --no-install-recommends && \
    rm -rf /var/lib/apt/lists/* && \
    npm i -g corepack@0.34.5 && \
    corepack enable

WORKDIR /var/www

FROM base AS dev
ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /tmp/corepack
COPY package.json /tmp/corepack/package.json
RUN corepack install && rm -rf /tmp/corepack

WORKDIR /var/www

CMD ["sh", "-lc", "\
  [ -d node_modules ] && [ -d apps/frontend-demo/node_modules ] || pnpm install --frozen-lockfile --prefer-offline --filter=frontend-demo...; \
  [ -f libs/ui/dist/utils.js ] || pnpm --filter=@techsio/ui-kit build; \
  pnpm --filter frontend-demo exec next dev --hostname 0.0.0.0 --port 3000 \
"]
