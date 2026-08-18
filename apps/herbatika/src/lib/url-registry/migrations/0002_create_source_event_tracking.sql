-- Immutable migration: the checksum-verified migration runner owns BEGIN/COMMIT.
-- A receipt means the source event was durably applied. Exact replays do not
-- create additional rows. A different event or fingerprint for an already
-- covered stream sequence is a permanent producer-integrity conflict.

CREATE TABLE url_registry.url_registry_source_event_receipt (
  source_system text NOT NULL CHECK (
    length(source_system) BETWEEN 1 AND 64
    AND source_system = btrim(source_system)
  ),
  source_type text NOT NULL CHECK (
    length(source_type) BETWEEN 1 AND 64
    AND source_type = btrim(source_type)
  ),
  source_id text NOT NULL CHECK (
    length(source_id) BETWEEN 1 AND 255
    AND source_id = btrim(source_id)
  ),
  market text NOT NULL CHECK (market IN ('sk', 'cz', 'hu', 'ro')),
  stream_sequence integer NOT NULL CHECK (stream_sequence > 0),
  source_event_id text NOT NULL CHECK (
    length(source_event_id) BETWEEN 1 AND 255
    AND source_event_id = btrim(source_event_id)
  ),
  envelope_fingerprint text NOT NULL CHECK (
    envelope_fingerprint ~ '^sha256:[0-9a-f]{64}$'
  ),
  change_type text NOT NULL CHECK (change_type IN ('reconcile', 'delete')),
  action text NOT NULL CHECK (
    action IN (
      'retired',
      'noop-source-present',
      'noop-source-missing',
      'noop-route-missing',
      'noop-route-terminal',
      'requires-publication'
    )
  ),
  command_idempotency_key text CHECK (
    command_idempotency_key IS NULL OR (
      length(command_idempotency_key) BETWEEN 1 AND 255
      AND command_idempotency_key = btrim(command_idempotency_key)
    )
  ),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),

  CONSTRAINT url_registry_source_event_receipt_primary
    PRIMARY KEY (
      source_system,
      source_type,
      source_id,
      market,
      stream_sequence
    ),
  CONSTRAINT url_registry_source_event_receipt_source_event_unique
    UNIQUE (source_system, source_event_id, market),
  CONSTRAINT url_registry_source_event_receipt_command_unique
    UNIQUE (command_idempotency_key),
  CONSTRAINT url_registry_source_event_receipt_change_action_check CHECK (
    (
      change_type = 'reconcile'
      AND action IN (
        'noop-source-present',
        'noop-source-missing',
        'requires-publication'
      )
    )
    OR (
      change_type = 'delete'
      AND action IN (
        'retired',
        'noop-source-present',
        'noop-route-missing',
        'noop-route-terminal'
      )
    )
  ),
  CONSTRAINT url_registry_source_event_receipt_command_check CHECK (
    (
      action = 'retired'
      AND command_idempotency_key IS NOT NULL
    )
    OR (
      action <> 'retired'
      AND command_idempotency_key IS NULL
    )
  ),
  CONSTRAINT url_registry_source_event_receipt_command_foreign
    FOREIGN KEY (command_idempotency_key)
    REFERENCES url_registry.url_registry_command (idempotency_key)
    DEFERRABLE INITIALLY DEFERRED
);

CREATE TABLE url_registry.url_registry_source_event_cursor (
  source_system text NOT NULL CHECK (
    length(source_system) BETWEEN 1 AND 64
    AND source_system = btrim(source_system)
  ),
  source_type text NOT NULL CHECK (
    length(source_type) BETWEEN 1 AND 64
    AND source_type = btrim(source_type)
  ),
  source_id text NOT NULL CHECK (
    length(source_id) BETWEEN 1 AND 255
    AND source_id = btrim(source_id)
  ),
  market text NOT NULL CHECK (market IN ('sk', 'cz', 'hu', 'ro')),
  last_sequence integer NOT NULL CHECK (last_sequence > 0),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),

  CONSTRAINT url_registry_source_event_cursor_primary
    PRIMARY KEY (source_system, source_type, source_id, market),
  CONSTRAINT url_registry_source_event_cursor_timestamp_check CHECK (
    updated_at >= created_at
  ),
  CONSTRAINT url_registry_source_event_cursor_receipt_foreign
    FOREIGN KEY (
      source_system,
      source_type,
      source_id,
      market,
      last_sequence
    )
    REFERENCES url_registry.url_registry_source_event_receipt (
      source_system,
      source_type,
      source_id,
      market,
      stream_sequence
    )
    DEFERRABLE INITIALLY DEFERRED
);

CREATE TRIGGER url_registry_source_event_receipt_append_only
BEFORE UPDATE OR DELETE
ON url_registry.url_registry_source_event_receipt
FOR EACH ROW EXECUTE FUNCTION url_registry.deny_append_only_mutation(
  'URL registry source event receipt is append-only'
);

CREATE FUNCTION url_registry.guard_url_registry_source_event_cursor()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.last_sequence <> 1 THEN
      RAISE EXCEPTION 'URL registry source event cursor must start at sequence one'
        USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'URL registry source event cursor cannot be deleted'
      USING ERRCODE = '23514';
  END IF;

  IF ROW(
    NEW.source_system,
    NEW.source_type,
    NEW.source_id,
    NEW.market,
    NEW.created_at
  ) IS DISTINCT FROM ROW(
    OLD.source_system,
    OLD.source_type,
    OLD.source_id,
    OLD.market,
    OLD.created_at
  ) THEN
    RAISE EXCEPTION 'URL registry source event cursor identity is immutable'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.last_sequence <> OLD.last_sequence + 1 THEN
    RAISE EXCEPTION 'URL registry source event cursor must advance by exactly one'
      USING ERRCODE = '23514';
  END IF;

  NEW.updated_at := clock_timestamp();
  RETURN NEW;
END;
$$;

CREATE TRIGGER url_registry_source_event_cursor_guard
BEFORE INSERT OR UPDATE OR DELETE
ON url_registry.url_registry_source_event_cursor
FOR EACH ROW EXECUTE FUNCTION url_registry.guard_url_registry_source_event_cursor();

-- A deferred FK validates only the cursor's final row. This per-transition
-- constraint additionally proves that every queued +1 step has its own exact
-- receipt, even when one transaction advances the cursor multiple times.
CREATE FUNCTION url_registry.assert_url_registry_source_event_cursor_receipt()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM url_registry.url_registry_source_event_receipt
    WHERE source_system = NEW.source_system
      AND source_type = NEW.source_type
      AND source_id = NEW.source_id
      AND market = NEW.market
      AND stream_sequence = NEW.last_sequence
  ) THEN
    RAISE EXCEPTION 'URL registry source event cursor step requires its exact receipt'
      USING ERRCODE = '23514';
  END IF;

  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER url_registry_source_event_cursor_receipt_deferred
AFTER INSERT OR UPDATE
ON url_registry.url_registry_source_event_cursor
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION url_registry.assert_url_registry_source_event_cursor_receipt();

-- The cursor FK proves that its high-water mark has a corresponding receipt.
-- This reverse deferred check proves that every inserted receipt is covered by
-- the same stream's cursor before the transaction can commit.
CREATE FUNCTION url_registry.assert_url_registry_source_event_receipt_cursor()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  persisted_last_sequence integer;
BEGIN
  SELECT last_sequence
  INTO persisted_last_sequence
  FROM url_registry.url_registry_source_event_cursor
  WHERE source_system = NEW.source_system
    AND source_type = NEW.source_type
    AND source_id = NEW.source_id
    AND market = NEW.market;

  IF persisted_last_sequence IS NULL
    OR persisted_last_sequence < NEW.stream_sequence
  THEN
    RAISE EXCEPTION 'URL registry source event receipt requires a covering cursor'
      USING ERRCODE = '23514';
  END IF;

  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER url_registry_source_event_receipt_cursor_deferred
AFTER INSERT
ON url_registry.url_registry_source_event_receipt
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION url_registry.assert_url_registry_source_event_receipt_cursor();

-- A retirement receipt may only attest to the URLR transaction that actually
-- retired the same source identity for the same per-market event and market.
CREATE FUNCTION url_registry.assert_url_registry_source_event_retirement_command()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  retirement_command_is_valid boolean;
BEGIN
  IF NEW.action <> 'retired' THEN
    RETURN NULL;
  END IF;

  SELECT TRUE
  INTO retirement_command_is_valid
  FROM url_registry.url_registry_command AS persisted_command
  INNER JOIN url_registry.url_route AS route
    ON route.id = persisted_command.route_id
  WHERE persisted_command.idempotency_key = NEW.command_idempotency_key
    AND persisted_command.command_type = 'retire-route'
    AND persisted_command.status = 'completed'
    AND persisted_command.outcome = 'applied'
    AND persisted_command.source_system = NEW.source_system
    AND persisted_command.source_type = NEW.source_type
    AND persisted_command.source_id = NEW.source_id
    AND persisted_command.source_event_id = NEW.source_event_id
    AND route.market = NEW.market;

  IF retirement_command_is_valid IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'URL registry retirement receipt requires its completed retirement command'
      USING ERRCODE = '23514';
  END IF;

  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER url_registry_source_event_retirement_command_deferred
AFTER INSERT
ON url_registry.url_registry_source_event_receipt
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION url_registry.assert_url_registry_source_event_retirement_command();
