FROM node:26.11.1-bookworm-slim

ARG PLAYWRIGHT_VERSION=1.64.0

ENV PLAYWRIGHT_BROWSERS_PATH=0

WORKDIR /app

# The full Node image supplied DejaVu through fontconfig's dependencies.
# Keep the reviewed system font (including bold) when using the slim base.
RUN apt-get update \
  && apt-get install -y --no-install-recommends fonts-dejavu-core \
  && npm init -y \
  && npm i -D @playwright/test@${PLAYWRIGHT_VERSION} pngjs@7.0.0 \
  && npx -y playwright@${PLAYWRIGHT_VERSION} install --with-deps --only-shell chromium \
  && npx -y playwright@${PLAYWRIGHT_VERSION} install --with-deps webkit \
  && test "$(fc-match --format '%{postscriptname}' sans-serif)" = DejaVuSans \
  && test "$(fc-match --format '%{postscriptname}' 'sans-serif:weight=bold')" = DejaVuSans-Bold \
  && rm -rf /var/lib/apt/lists/* /root/.npm \
  && chown -R node:node /app

HEALTHCHECK NONE
USER node

ENTRYPOINT ["npx", "playwright"]
