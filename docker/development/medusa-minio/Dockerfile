# syntax=docker/dockerfile:1.7

ARG MINIO_IMAGE=minio/minio@sha256:14cea493d9a34af32f524e538b8346cf79f3321eff8e708c1e2960462bd8936e
ARG MINIO_MC_IMAGE=minio/mc@sha256:a7fe349ef4bd8521fb8497f55c6042871b2ae640607cf99d9bede5e9bdf11727

FROM ${MINIO_MC_IMAGE} AS minio-mc

FROM ${MINIO_IMAGE}

COPY --from=minio-mc /usr/bin/mc /usr/bin/mc
COPY entrypoint.sh /usr/local/bin/minio-entrypoint.sh
RUN chmod 755 /usr/local/bin/minio-entrypoint.sh

ENTRYPOINT ["/usr/local/bin/minio-entrypoint.sh"]
CMD ["server", "/data", "--console-address", ":9003", "--address", ":9004"]
