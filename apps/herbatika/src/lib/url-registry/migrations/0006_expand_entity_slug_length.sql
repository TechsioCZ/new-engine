-- Immutable migration: the checksum-verified migration runner owns BEGIN/COMMIT.
-- Storefront publication contracts accept normalized customer slugs up to 255
-- characters, so persistence must enforce the same boundary.

SET LOCAL lock_timeout = '5s';

ALTER TABLE url_registry.url_entity_slug
  DROP CONSTRAINT url_entity_slug_normalized_slug_check;

ALTER TABLE url_registry.url_entity_slug
  ADD CONSTRAINT url_entity_slug_normalized_slug_check CHECK (
    length(normalized_slug) BETWEEN 1 AND 255
    AND normalized_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  );
