FROM oven/bun:1.3.5 AS build

WORKDIR /workspace

COPY apps/zane-operator/src ./apps/zane-operator/src

RUN bun build ./apps/zane-operator/src/main.ts --compile --outfile /out/zane-operator
RUN bun build ./apps/zane-operator/src/bootstrap-role.ts --compile --outfile /out/zane-operator-bootstrap-role

FROM debian:bookworm-slim AS runtime

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=build /out/zane-operator /app/zane-operator
COPY --from=build /out/zane-operator-bootstrap-role /app/zane-operator-bootstrap-role

RUN useradd --system --uid 1001 zaneoperator \
  && chown zaneoperator:zaneoperator /app/zane-operator /app/zane-operator-bootstrap-role \
  && chmod +x /app/zane-operator /app/zane-operator-bootstrap-role

USER zaneoperator

ENV PORT=8080

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -fsS "http://127.0.0.1:${PORT}/healthz" >/dev/null || exit 1

ENTRYPOINT ["/app/zane-operator"]
