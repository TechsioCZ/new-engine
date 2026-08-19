-- Immutable migration: the checksum-verified migration runner owns BEGIN/COMMIT.
-- Extend source-event receipts from delete-only URLR commands to the complete
-- product publication lifecycle while preserving all version-two receipts.

ALTER TABLE url_registry.url_registry_source_event_receipt
  DROP CONSTRAINT url_registry_source_event_receipt_action_check,
  DROP CONSTRAINT url_registry_source_event_receipt_change_action_check,
  DROP CONSTRAINT url_registry_source_event_receipt_command_check;

ALTER TABLE url_registry.url_registry_source_event_receipt
  ADD CONSTRAINT url_registry_source_event_receipt_action_check CHECK (
    action IN (
      'published',
      'slug-changed',
      'unpublished',
      'noop-unpublished',
      'retired',
      'noop-source-present',
      'noop-source-missing',
      'noop-route-missing',
      'noop-route-terminal',
      'requires-publication'
    )
  ),
  ADD CONSTRAINT url_registry_source_event_receipt_change_action_check CHECK (
    (
      change_type = 'reconcile'
      AND action IN (
        'published',
        'slug-changed',
        'unpublished',
        'noop-unpublished',
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
  ADD CONSTRAINT url_registry_source_event_receipt_command_check CHECK (
    (
      action IN ('published', 'slug-changed', 'retired')
      AND command_idempotency_key IS NOT NULL
    )
    OR (
      action NOT IN ('published', 'slug-changed', 'retired')
      AND command_idempotency_key IS NULL
    )
  );

DROP TRIGGER url_registry_source_event_retirement_command_deferred
  ON url_registry.url_registry_source_event_receipt;
DROP FUNCTION url_registry.assert_url_registry_source_event_retirement_command();

-- Every command-bearing receipt must attest to the exact completed URLR
-- transaction for the same source identity, source event, and market.
CREATE FUNCTION url_registry.assert_url_registry_source_event_command()
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

CREATE CONSTRAINT TRIGGER url_registry_source_event_command_deferred
AFTER INSERT
ON url_registry.url_registry_source_event_receipt
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION url_registry.assert_url_registry_source_event_command();
