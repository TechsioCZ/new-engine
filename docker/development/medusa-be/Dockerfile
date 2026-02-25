FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN apt-get update && apt-get install -y curl --no-install-recommends && \
    rm -rf /var/lib/apt/lists/* && \
    npm i -g corepack@0.34.5 && \
    corepack enable

WORKDIR /var/www

# ============================================
# DEV TARGET - uses host volume mounts
# ============================================
FROM base AS dev
ENV NODE_ENV=development
ENV DATABASE_TYPE=postgres
CMD ["pnpm", "--filter", "medusa-be", "dev"]
#CMD ["tail", "-f", "/dev/null"]

# ============================================
# PROD BUILD STAGE - compiles everything
# ============================================
FROM base AS build

COPY . .

# Build using shared script (cleanup, install, build, validate, prod deploy)
ARG FEATURE_PPL_ENABLED=0
RUN FEATURE_PPL_ENABLED=${FEATURE_PPL_ENABLED} ./scripts/build-medusa.sh

# ============================================
# PROD RUNTIME - minimal final image
# ============================================
FROM node:22-slim AS prod

# curl needed for healthcheck
RUN apt-get update && apt-get install -y curl --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV DATABASE_TYPE=postgres

WORKDIR /app

# Copy files with node user ownership (UID 1000, comes with node image)
COPY --from=build --chown=node:node /var/www/apps/medusa-be/.medusa/server ./
COPY --from=build --chown=node:node /var/www/medusa-be-prod/node_modules ./node_modules
COPY --from=build --chown=node:node /var/www/apps/medusa-be/src/scripts/seed-files ./src/scripts/seed-files

# Create writable dirs for runtime (types, admin assets, local uploads if used)
RUN mkdir -p /app/.medusa/types /app/.medusa/client /app/static && \
    chown -R node:node /app/.medusa /app/static

# Run as non-root user
USER node

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:9000/health || exit 1

CMD ["npm", "start"]
