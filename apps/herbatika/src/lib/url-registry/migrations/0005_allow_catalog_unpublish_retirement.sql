-- Immutable migration: the checksum-verified migration runner owns BEGIN/COMMIT.
-- Catalog unpublishing retires the active route, so its reconcile receipt owns
-- a retire-route command. Product translation invalidation can also retire an
-- active route, while ordinary product unpublished receipts stay commandless.
-- This migration is deliberately expand-only: version-three writers may have
-- persisted commandless unpublished receipts for any source type. A later
-- contract migration may narrow that legacy shape only after every old writer
-- and historical row has been drained or backfilled.

SET LOCAL lock_timeout = '5s';

DO $preflight$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM url_registry.url_registry_source_event_receipt AS receipt
    WHERE NOT (
      (
        receipt.action IN ('published', 'slug-changed', 'retired')
        AND receipt.command_idempotency_key IS NOT NULL
      )
      OR (
        receipt.action = 'unpublished'
        AND (
          receipt.command_idempotency_key IS NULL
          OR receipt.source_type IN ('product', 'category', 'brand', 'collection')
        )
      )
      OR (
        receipt.action NOT IN (
          'published', 'slug-changed', 'retired', 'unpublished'
        )
        AND receipt.command_idempotency_key IS NULL
      )
    )
  ) THEN
    RAISE EXCEPTION 'URL registry contains source-event receipts incompatible with migration 0005'
      USING ERRCODE = '23514';
  END IF;
END;
$preflight$;

ALTER TABLE url_registry.url_registry_source_event_receipt
  DROP CONSTRAINT url_registry_source_event_receipt_command_check;

ALTER TABLE url_registry.url_registry_source_event_receipt
  ADD CONSTRAINT url_registry_source_event_receipt_command_check CHECK (
    (
      action IN ('published', 'slug-changed', 'retired')
      AND command_idempotency_key IS NOT NULL
    )
    OR (
      action = 'unpublished'
      AND (
        command_idempotency_key IS NULL
        OR source_type IN ('product', 'category', 'brand', 'collection')
      )
    )
    OR (
      action NOT IN ('published', 'slug-changed', 'retired', 'unpublished')
      AND command_idempotency_key IS NULL
    )
  );

CREATE OR REPLACE FUNCTION url_registry.assert_url_registry_source_event_command()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  expected_command_type text;
  source_event_command_is_valid boolean;
BEGIN
  IF NEW.command_idempotency_key IS NULL THEN
    RETURN NULL;
  END IF;

  expected_command_type := CASE NEW.action
    WHEN 'published' THEN 'create-entity-route'
    WHEN 'slug-changed' THEN 'change-slug'
    WHEN 'retired' THEN 'retire-route'
    WHEN 'unpublished' THEN CASE
      WHEN NEW.source_type IN ('product', 'category', 'brand', 'collection')
        THEN 'retire-route'
      ELSE NULL
    END
    ELSE NULL
  END;

  IF expected_command_type IS NULL THEN
    RAISE EXCEPTION 'URL registry command-bearing receipt has no matching action'
      USING ERRCODE = '23514';
  END IF;

  SELECT TRUE
  INTO source_event_command_is_valid
  FROM url_registry.url_registry_command AS persisted_command
  INNER JOIN url_registry.url_route AS route
    ON route.id = persisted_command.route_id
  WHERE persisted_command.idempotency_key = NEW.command_idempotency_key
    AND persisted_command.command_type = expected_command_type
    AND persisted_command.status = 'completed'
    AND persisted_command.outcome = 'applied'
    AND persisted_command.source_system = NEW.source_system
    AND persisted_command.source_type = NEW.source_type
    AND persisted_command.source_id = NEW.source_id
    AND persisted_command.source_event_id = NEW.source_event_id
    AND route.market = NEW.market;

  IF source_event_command_is_valid IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'URL registry source event receipt requires its matching completed command'
      USING ERRCODE = '23514';
  END IF;

  RETURN NULL;
END;
$$;
