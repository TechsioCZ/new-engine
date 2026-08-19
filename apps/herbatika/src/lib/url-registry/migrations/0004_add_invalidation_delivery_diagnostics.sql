ALTER TABLE url_registry.url_registry_invalidation_outbox
  ADD COLUMN last_error_code text,
  ADD COLUMN failed_at timestamptz;

UPDATE url_registry.url_registry_invalidation_outbox
SET last_error_code = 'legacy-failure',
    failed_at = COALESCE(available_at, created_at)
WHERE status = 'failed';

ALTER TABLE url_registry.url_registry_invalidation_outbox
  ADD CONSTRAINT url_registry_outbox_error_code_check CHECK (
    last_error_code IS NULL
    OR (
      length(last_error_code) BETWEEN 1 AND 128
      AND last_error_code = btrim(last_error_code)
    )
  ),
  ADD CONSTRAINT url_registry_outbox_failed_diagnostics_check CHECK (
    (status = 'failed' AND failed_at IS NOT NULL AND last_error_code IS NOT NULL)
    OR (status <> 'failed' AND failed_at IS NULL)
  );

CREATE INDEX url_registry_invalidation_outbox_failed_idx
  ON url_registry.url_registry_invalidation_outbox (failed_at, id)
  WHERE status = 'failed';
