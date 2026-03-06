# syntax=docker/dockerfile:1.7

ARG POSTGRES_IMAGE=postgres:18.1-alpine@sha256:aa6eb304ddb6dd26df23d05db4e5cb05af8951cda3e0dc57731b771e0ef4ab29
FROM ${POSTGRES_IMAGE}

COPY initdb/ /docker-entrypoint-initdb.d/
RUN find /docker-entrypoint-initdb.d -type f -name '*.sh' -exec chmod 755 {} +
