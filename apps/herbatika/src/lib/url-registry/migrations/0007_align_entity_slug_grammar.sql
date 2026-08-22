-- Immutable migration: the checksum-verified migration runner owns BEGIN/COMMIT.
-- Customer-authoritative slugs may contain consecutive hyphens. Persistence must
-- match the validated publication grammar while still requiring an alphanumeric
-- character and rejecting every character outside lowercase ASCII and hyphen.

SET LOCAL lock_timeout = '5s';

ALTER TABLE url_registry.url_entity_slug
  DROP CONSTRAINT url_entity_slug_normalized_slug_check;

ALTER TABLE url_registry.url_entity_slug
  ADD CONSTRAINT url_entity_slug_normalized_slug_check CHECK (
    length(normalized_slug) BETWEEN 1 AND 255
    AND normalized_slug ~ '^[a-z0-9-]+$'
    AND normalized_slug ~ '[a-z0-9]'
  );
