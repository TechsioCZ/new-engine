# syntax=docker/dockerfile:1.7
ARG MEILISEARCH_IMAGE=getmeili/meilisearch:v1.44.0@sha256:b839a48d008d4e67e57f78dcff5b21d5e8b8fa066bacd11f97824d6307abb0dd

FROM ${MEILISEARCH_IMAGE}

COPY entrypoint.sh /usr/local/bin/meilisearch-entrypoint.sh
RUN chmod 755 /usr/local/bin/meilisearch-entrypoint.sh

ENTRYPOINT ["/usr/local/bin/meilisearch-entrypoint.sh"]
CMD ["/bin/meilisearch"]
