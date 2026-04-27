# syntax=docker/dockerfile:1.7
ARG MEILISEARCH_IMAGE=getmeili/meilisearch:v1.35.1@sha256:8b57fc3c7f46535ddef3828df1538465ac19d892eb57c9a10da6df0880bd5856

FROM ${MEILISEARCH_IMAGE}

COPY entrypoint.sh /usr/local/bin/meilisearch-entrypoint.sh
RUN chmod 755 /usr/local/bin/meilisearch-entrypoint.sh

ENTRYPOINT ["/usr/local/bin/meilisearch-entrypoint.sh"]
CMD ["/bin/meilisearch"]
