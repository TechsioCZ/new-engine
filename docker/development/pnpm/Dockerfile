FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

#temp solution to https://github.com/nodejs/corepack/issues/612
RUN npm i -g corepack@latest

RUN corepack enable
RUN corepack install -g pnpm@10.26.0
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
WORKDIR /var/www
