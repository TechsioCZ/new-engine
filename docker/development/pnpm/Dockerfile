FROM node:26.10.0-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN apt-get update \
  && apt-get install -y --no-install-recommends git \
  && rm -rf /var/lib/apt/lists/*

# Install the package manager pinned by the workspace.
COPY package.json /tmp/pnpm-bootstrap/package.json
RUN npm install --global "$(node -p "require('/tmp/pnpm-bootstrap/package.json').packageManager")" \
  && rm -rf /tmp/pnpm-bootstrap

RUN mkdir -p /tmp/pnpm-toolchain-home /tmp/pnpm-toolchain-cache \
  && chmod 1777 /tmp/pnpm-toolchain-home /tmp/pnpm-toolchain-cache
WORKDIR /var/www
