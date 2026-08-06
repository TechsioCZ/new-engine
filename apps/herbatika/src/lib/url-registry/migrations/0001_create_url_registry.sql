CREATE SCHEMA IF NOT EXISTS url_registry;

CREATE TABLE IF NOT EXISTS url_registry.url_records (
  id uuid PRIMARY KEY,
  market text NOT NULL CHECK (market IN ('sk', 'cz', 'hu', 'ro')),
  kind text NOT NULL CHECK (
    kind IN ('product', 'category', 'brand', 'collection', 'campaign', 'article', 'page')
  ),
  slug text NOT NULL CHECK (
    length(slug) BETWEEN 1 AND 80
    AND slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  entity_id text NOT NULL,
  equivalence_key text NOT NULL,
  indexable boolean NOT NULL DEFAULT true,
  status text NOT NULL CHECK (status IN ('current', 'alias', 'tombstone')),
  alias_of uuid NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT url_records_market_kind_slug_unique UNIQUE (market, kind, slug),
  CONSTRAINT url_records_alias_state_check CHECK (
    (status = 'alias' AND alias_of IS NOT NULL)
    OR (status <> 'alias' AND alias_of IS NULL)
  ),
  CONSTRAINT url_records_alias_of_foreign
    FOREIGN KEY (alias_of)
    REFERENCES url_registry.url_records(id)
    DEFERRABLE INITIALLY DEFERRED
);

CREATE UNIQUE INDEX IF NOT EXISTS url_records_current_entity_unique
  ON url_registry.url_records (market, kind, entity_id)
  WHERE status = 'current';

CREATE INDEX IF NOT EXISTS url_records_entity_lookup_idx
  ON url_registry.url_records (market, kind, entity_id);

CREATE INDEX IF NOT EXISTS url_records_equivalence_key_idx
  ON url_registry.url_records (equivalence_key);

CREATE OR REPLACE FUNCTION url_registry.enforce_direct_alias_target()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM url_registry.url_records AS alias
    LEFT JOIN url_registry.url_records AS target ON target.id = alias.alias_of
    WHERE alias.status = 'alias'
      AND (
        target.id IS NULL
        OR target.status <> 'current'
        OR target.market <> alias.market
        OR target.kind <> alias.kind
        OR target.entity_id <> alias.entity_id
      )
  ) THEN
    RAISE EXCEPTION 'Every URL alias must point directly to its entity current record'
      USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS url_records_direct_alias_target ON url_registry.url_records;
CREATE CONSTRAINT TRIGGER url_records_direct_alias_target
AFTER INSERT OR UPDATE ON url_registry.url_records
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION url_registry.enforce_direct_alias_target();
