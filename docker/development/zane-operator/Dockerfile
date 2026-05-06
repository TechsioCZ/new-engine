FROM node:24-slim AS deps

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl \
  && rm -rf /var/lib/apt/lists/* \
  && npm i -g corepack@0.34.5 \
  && corepack enable

WORKDIR /var/www

ENV NODE_ENV=production

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/zane-operator/package.json apps/zane-operator/package.json
RUN --mount=type=cache,id=pnpm-store-zane-operator,target=/pnpm/store \
  corepack install \
  && pnpm fetch --store-dir=/pnpm/store --frozen-lockfile
RUN --mount=type=cache,id=pnpm-store-zane-operator,target=/pnpm/store \
  pnpm install --store-dir=/pnpm/store --offline --frozen-lockfile --prod --filter=zane-operator...

FROM oven/bun:1.3.5 AS build

WORKDIR /var/www

COPY --from=deps /var/www /var/www
COPY apps/zane-operator/src ./apps/zane-operator/src

RUN bun build ./apps/zane-operator/src/main.ts --compile --outfile /out/zane-operator

FROM debian:bookworm-slim AS prod

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=build /out/zane-operator /app/zane-operator

RUN useradd --system --uid 1001 zaneoperator \
  && chown zaneoperator:zaneoperator /app/zane-operator \
  && chmod +x /app/zane-operator

USER zaneoperator

ENV PORT=8080

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -fsS "http://127.0.0.1:${PORT}/healthz" >/dev/null || exit 1

ENTRYPOINT ["/app/zane-operator"]
