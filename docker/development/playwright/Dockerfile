FROM node:24-bookworm

ARG PLAYWRIGHT_VERSION=1.58.2

ENV PLAYWRIGHT_BROWSERS_PATH=0

WORKDIR /app

RUN npm init -y \
  && npm i -D @playwright/test@${PLAYWRIGHT_VERSION} http-server \
  && npx -y playwright@${PLAYWRIGHT_VERSION} install --with-deps chromium webkit \
  && chown -R node:node /app

HEALTHCHECK NONE
USER node

ENTRYPOINT ["npx", "playwright"]
