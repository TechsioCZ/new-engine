# RO cutover private backup helper

This image is an operator-only PostgreSQL backup and disposable restore-drill runner. It has no HTTP route, declares no port or volume, and defaults to an idle health-checked process. It never starts Medusa.

Build from an exact repository commit:

```sh
docker build \
  --file apps/medusa-be/Dockerfile.ro-cutover-backup \
  --build-arg SOURCE_COMMIT="$(git rev-parse HEAD)" \
  --tag "ro-cutover-backup:$(git rev-parse HEAD)" \
  .
```

The base image is digest-pinned. PostgreSQL client 18.6 and Node 24.18.1 are APK-version-pinned. Rclone 1.74.2 is downloaded over HTTPS and verified against separate amd64/arm64 SHA256 values before installation.

## Safety contract

- Database URLs are read only from a named environment variable, never accepted as CLI values or printed.
- S3 credentials use `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and optional `AWS_SESSION_TOKEN`; only credential-free HTTPS endpoint origins are accepted. Rclone's S3 defaults keep objects private, and uploads are immutable.
- `backup` makes a PostgreSQL custom-format dump without `--no-owner` or `--no-acl`, reserves dump/checksum paths with mode `0600`, refuses collisions, and writes a SHA256 sidecar.
- `download` and `verify-roundtrip` verify bytes against the private checksum object. No presigned URL is created or accepted.
- `restore-drill` requires source, maintenance, and target database names to be pairwise distinct. The target must match `ro_demo_disposable_*`. It is created with an exact ownership comment, restored and validated, then dropped in `finally` only after an owner-and-comment query succeeds. SIGINT/SIGTERM abort active tools and still pass through that cleanup.
- Child processes use argv with `shell: false` and a small allowlisted environment. Child stdout is not forwarded; errors are bounded and redacted.

## Commands

All options are unique `--name value` pairs. Examples assume the container has a writable `/work` directory (ephemeral container filesystem or an operator-selected bind mount).

```sh
# Read-only identity and access checks.
SOURCE_DATABASE_URL='postgresql://...' \
AWS_ACCESS_KEY_ID='...' AWS_SECRET_ACCESS_KEY='...' \
node index.mts preflight \
  --db-url-env SOURCE_DATABASE_URL --expected-db medusa \
  --endpoint https://objects.example.invalid --bucket private-cutover

# Dump plus /work/ro.dump.sha256, both mode 0600 and no-clobber.
node index.mts backup \
  --db-url-env SOURCE_DATABASE_URL --expected-db medusa \
  --output /work/ro.dump

node index.mts upload \
  --endpoint https://objects.example.invalid --bucket private-cutover \
  --object-key ro/2026-08-20/ro.dump --input /work/ro.dump

node index.mts verify-roundtrip \
  --endpoint https://objects.example.invalid --bucket private-cutover \
  --object-key ro/2026-08-20/ro.dump --input /work/ro.dump

# RESTORE_ADMIN_DATABASE_URL must name a maintenance DB distinct from source/target.
node index.mts restore-drill \
  --admin-db-url-env RESTORE_ADMIN_DATABASE_URL \
  --source-db medusa \
  --target-db ro_demo_disposable_20260820_a1 \
  --dump /work/ro.dump
```

Never point `restore-drill` at a production database name. The prefix alone is insufficient for deletion: the exact marker and current database owner must also match.
