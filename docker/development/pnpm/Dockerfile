FROM node:24-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN apt-get update \
  && apt-get install -y --no-install-recommends git \
  && rm -rf /var/lib/apt/lists/*

# Temporary solution to https://github.com/nodejs/corepack/issues/612.
# Keep this aligned with the application development images for reproducibility.
RUN npm i -g corepack@0.34.5

RUN corepack enable
RUN mkdir -p /tmp/pnpm-toolchain-home /tmp/pnpm-toolchain-cache \
  && chmod 1777 /tmp/pnpm-toolchain-home /tmp/pnpm-toolchain-cache
WORKDIR /var/www
