FROM oven/bun:1.3.5 AS build

WORKDIR /workspace

COPY apps/zane-operator/src ./apps/zane-operator/src

RUN bun build ./apps/zane-operator/src/main.ts --compile --outfile /out/zane-operator

FROM debian:bookworm-slim AS runtime

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
