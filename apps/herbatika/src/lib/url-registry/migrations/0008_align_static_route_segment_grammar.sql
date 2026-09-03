-- Immutable migration: the checksum-verified migration runner owns BEGIN/COMMIT.
-- Static route segments share the same validated publication grammar as entity
-- slugs (see 0006/0007): customer-authoritative segments may be up to 255
-- characters and contain consecutive hyphens, while still requiring an
-- alphanumeric character and rejecting every character outside lowercase
-- ASCII and hyphen.

SET LOCAL lock_timeout = '5s';

ALTER TABLE url_registry.static_route_path
  DROP CONSTRAINT static_route_path_segment_check;

ALTER TABLE url_registry.static_route_path
  ADD CONSTRAINT static_route_path_segment_check CHECK (
    length(segment) BETWEEN 1 AND 255
    AND segment ~ '^[a-z0-9-]+$'
    AND segment ~ '[a-z0-9]'
  );
