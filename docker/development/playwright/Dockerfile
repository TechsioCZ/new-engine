FROM node:26.11.1-bookworm

ARG PLAYWRIGHT_VERSION=1.64.0

ENV PLAYWRIGHT_BROWSERS_PATH=0

WORKDIR /app

RUN npm init -y \
  && npm i -D @playwright/test@${PLAYWRIGHT_VERSION} pngjs@7.0.0 \
  && npx -y playwright@${PLAYWRIGHT_VERSION} install --with-deps chromium webkit \
  && chown -R node:node /app

HEALTHCHECK NONE
USER node

ENTRYPOINT ["npx", "playwright"]
