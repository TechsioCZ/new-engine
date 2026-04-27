# syntax=docker/dockerfile:1.7

ARG POSTGRES_IMAGE=postgres:18.1-alpine@sha256:aa6eb304ddb6dd26df23d05db4e5cb05af8951cda3e0dc57731b771e0ef4ab29
FROM ${POSTGRES_IMAGE}

COPY postgres-role-bootstrap.sh /usr/local/bin/postgres-role-bootstrap
COPY postgres-ready-with-bootstrap.sh /usr/local/bin/postgres-ready-with-bootstrap.sh
COPY run-postgres-with-bootstrap.sh /usr/local/bin/run-postgres-with-bootstrap.sh
RUN chmod 755 \
  /usr/local/bin/postgres-role-bootstrap \
  /usr/local/bin/postgres-ready-with-bootstrap.sh \
  /usr/local/bin/run-postgres-with-bootstrap.sh
