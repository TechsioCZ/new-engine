CFLAGS=-g
export CFLAGS

# Global commands
corepack-update:
	docker build -f docker/development/pnpm/Dockerfile -t pnpm-env . && \
	docker run -v .:/var/www pnpm-env corepack up
install:
	docker build -f docker/development/pnpm/Dockerfile -t pnpm-env . && \
	docker run -v .:/var/www pnpm-env pnpm install --frozen-lockfile
install-fix-lock:
	docker build -f docker/development/pnpm/Dockerfile -t pnpm-env . && \
	docker run -v .:/var/www pnpm-env pnpm install --fix-lockfile
update-medusa:
	docker build -f docker/development/pnpm/Dockerfile -t pnpm-env . && \
	docker run -v .:/var/www pnpm-env pnpm --filter medusa-be update "@medusajs/*" --latest
update:
	docker build -f docker/development/pnpm/Dockerfile -t pnpm-env . && \
	docker run -v .:/var/www pnpm-env pnpm --filter medusa-be update --latest
npkill:
	docker build -f docker/development/pnpm/Dockerfile -t pnpm-env . && \
	docker run -it -v .:/var/www pnpm-env pnpx npkill -x -D -y
dev:
	docker compose -f docker-compose.yaml -p new-engine up --force-recreate -d --build
prod:
	-docker compose -f docker-compose.yaml -f docker-compose.prod.yaml -p new-engine down
	-docker rmi new-engine-medusa-be new-engine-n1
	# Build and start medusa-be first, then generate n1 categories against live Medusa API.
	docker compose -f docker-compose.yaml -f docker-compose.prod.yaml -p new-engine build --no-cache medusa-be
	docker compose -f docker-compose.yaml -f docker-compose.prod.yaml -p new-engine up -d medusa-be
	@echo "Waiting for medusa-be to become healthy..."
	@timeout=180; \
	while [ $$timeout -gt 0 ]; do \
		status=$$(docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}starting{{end}}' wr_medusa_be 2>/dev/null || echo "missing"); \
		if [ "$$status" = "healthy" ]; then \
			echo "medusa-be is healthy"; \
			break; \
		fi; \
		if [ "$$status" = "unhealthy" ]; then \
			echo "medusa-be is unhealthy"; \
			docker logs --tail=120 wr_medusa_be; \
			exit 1; \
		fi; \
		sleep 2; \
		timeout=$$((timeout-2)); \
	done; \
	if [ $$timeout -le 0 ]; then \
		echo "Timed out waiting for medusa-be health"; \
		docker logs --tail=120 wr_medusa_be; \
		exit 1; \
	fi
	docker compose -f docker-compose.yaml -p new-engine run --rm --no-deps \
		-e COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
		-e CI=1 \
		-e MEDUSA_BACKEND_URL_INTERNAL=http://medusa-be:9000 \
		n1 sh -lc "\
			[ -d node_modules ] && [ -d apps/n1/node_modules ] || pnpm install --frozen-lockfile --prefer-offline --filter=n1...; \
			pnpm --filter n1 run generate:categories \
		"
	docker compose -f docker-compose.yaml -f docker-compose.prod.yaml -p new-engine build --no-cache n1
	docker compose -f docker-compose.yaml -f docker-compose.prod.yaml -p new-engine up -d
down:
	docker compose -f docker-compose.yaml -p new-engine down
down-with-volumes:
	docker compose -f docker-compose.yaml -p new-engine down -v

# Medusa specific commands
# Usage: make medusa-create-user EMAIL=admin@example.com PASSWORD=secret
medusa-create-user:
	docker exec wr_medusa_be pnpm --filter medusa-be exec medusa user -e $(EMAIL) -p $(PASSWORD)
medusa-migrate:
	docker exec wr_medusa_be pnpm --filter medusa-be run migrate
# Usage: make medusa-generate-migration MODULE=my_module
medusa-generate-migration:
	docker exec wr_medusa_be pnpm --filter medusa-be run migrate:generate-only $(MODULE)
medusa-minio-init:
	docker exec wr_medusa_minio mc alias set local http://localhost:9004 minioadmin minioadmin && \
	docker exec wr_medusa_minio mc admin accesskey create --access-key minioadminkey --secret-key minioadminkey local && \
	docker cp ./docker/development/medusa-minio/config/local-bucket-metadata.zip wr_medusa_minio:. && \
	docker exec wr_medusa_minio mc admin cluster bucket import local /local-bucket-metadata.zip
medusa-meilisearch-reseed:
	docker exec wr_medusa_be pnpm --filter medusa-be run addInitialSearchDocuments
medusa-seed:
	docker exec wr_medusa_be pnpm --filter medusa-be run seedInitialData
medusa-seed-dev-data:
	docker exec wr_medusa_be pnpm --filter medusa-be run seedDevData
medusa-seed-n1:
	docker exec wr_medusa_be pnpm --filter medusa-be run seedN1

# Upgrade local postgres data from <18 cluster into PG18-compatible data dir.
postgres18-migrate-local:
	bash ./scripts/postgres18-local-migrate.sh

# Verify migrated PG18 state against old cluster data without deleting old state.
postgres18-verify:
	bash ./scripts/postgres18-verify-and-finalize.sh --check-only

# Verify migrated PG18 state and remove old cluster data + migration backups.
postgres18-finalize:
	bash ./scripts/postgres18-verify-and-finalize.sh --yes

# Biome commands
biome-be:
	bunx biome check --write apps/medusa-be
