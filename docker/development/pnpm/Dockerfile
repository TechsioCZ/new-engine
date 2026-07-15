FROM node:24-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

#temp solution to https://github.com/nodejs/corepack/issues/612
RUN npm i -g corepack@latest

RUN corepack enable
RUN mkdir -p /tmp/pnpm-toolchain-home /tmp/pnpm-toolchain-cache \
  && chmod 1777 /tmp/pnpm-toolchain-home /tmp/pnpm-toolchain-cache
WORKDIR /var/www
