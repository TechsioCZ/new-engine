import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260818111126 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "url_registry_outbox_event" drop constraint if exists "url_registry_outbox_event_stream_sequence_unique";`);
    this.addSql(`alter table if exists "url_registry_outbox_event" drop constraint if exists "url_registry_outbox_event_source_event_unique";`);
    this.addSql(`alter table if exists "url_registry_outbox_stream" drop constraint if exists "url_registry_outbox_stream_identity_unique";`);
    this.addSql(`create table if not exists "url_registry_outbox_stream" ("id" text not null, "source" text not null, "entity_kind" text not null, "entity_id" text not null, "market_code" text check ("market_code" in ('sk', 'cz', 'hu', 'ro')) not null, "last_sequence" integer not null default 0, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "url_registry_outbox_stream_pkey" primary key ("id"), constraint url_registry_outbox_stream_sequence_check check (last_sequence >= 0));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_url_registry_outbox_stream_deleted_at" ON "url_registry_outbox_stream" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_url_registry_outbox_stream_identity_unique" ON "url_registry_outbox_stream" ("source", "entity_kind", "entity_id", "market_code") WHERE TRUE AND deleted_at IS NULL;`);

    this.addSql(`create table if not exists "url_registry_outbox_event" ("id" text not null, "event_id" text not null, "source" text not null, "entity_kind" text not null, "entity_id" text not null, "market_code" text check ("market_code" in ('sk', 'cz', 'hu', 'ro')) not null, "stream_sequence" integer not null, "change_type" text check ("change_type" in ('reconcile', 'delete')) not null, "envelope_fingerprint" text not null, "payload" jsonb not null, "occurred_at" timestamptz not null, "status" text check ("status" in ('pending', 'processing', 'delivered', 'failed')) not null default 'pending', "attempt_count" integer not null default 0, "available_at" timestamptz not null, "claim_token" text null, "claimed_by" text null, "claimed_at" timestamptz null, "lease_expires_at" timestamptz null, "last_error_code" text null, "delivery_outcome" text check ("delivery_outcome" in ('applied', 'already-applied', 'noop-stale')) null, "delivered_at" timestamptz null, "failed_at" timestamptz null, "stream_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "url_registry_outbox_event_pkey" primary key ("id"), constraint url_registry_outbox_event_sequence_check check (stream_sequence > 0), constraint url_registry_outbox_event_attempt_count_check check (attempt_count >= 0));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_url_registry_outbox_event_stream_id" ON "url_registry_outbox_event" ("stream_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_url_registry_outbox_event_deleted_at" ON "url_registry_outbox_event" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_url_registry_outbox_event_source_event_unique" ON "url_registry_outbox_event" ("source", "event_id", "market_code") WHERE TRUE AND deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_url_registry_outbox_event_stream_sequence_unique" ON "url_registry_outbox_event" ("stream_id", "stream_sequence") WHERE TRUE AND deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_url_registry_outbox_event_dispatch" ON "url_registry_outbox_event" ("available_at", "id") WHERE status = 'pending' AND deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_url_registry_outbox_event_reclaim" ON "url_registry_outbox_event" ("lease_expires_at", "id") WHERE status = 'processing' AND deleted_at IS NULL;`);

    this.addSql(`alter table if exists "url_registry_outbox_event" add constraint "url_registry_outbox_event_stream_id_foreign" foreign key ("stream_id") references "url_registry_outbox_stream" ("id") on update cascade;`);

    this.addSql(`alter table "url_registry_outbox_stream" add constraint "url_registry_outbox_stream_identity_check" check (
      length("source") between 1 and 64
      and length("entity_kind") between 1 and 64
      and length("entity_id") between 1 and 255
    );`);

    this.addSql(`alter table "url_registry_outbox_stream" add constraint "url_registry_outbox_stream_event_identity_unique" unique (
      "id", "source", "entity_kind", "entity_id", "market_code"
    );`);

    this.addSql(`alter table "url_registry_outbox_event" add constraint "url_registry_outbox_event_stream_identity_foreign" foreign key (
      "stream_id", "source", "entity_kind", "entity_id", "market_code"
    ) references "url_registry_outbox_stream" (
      "id", "source", "entity_kind", "entity_id", "market_code"
    );`);

    this.addSql(`alter table "url_registry_outbox_event" add constraint "url_registry_outbox_event_envelope_check" check (
      length("event_id") between 1 and 255
      and length("source") between 1 and 64
      and length("entity_kind") between 1 and 64
      and length("entity_id") between 1 and 255
      and "envelope_fingerprint" ~ '^sha256:[0-9a-f]{64}$'
    );`);

    this.addSql(`alter table "url_registry_outbox_event" add constraint "url_registry_outbox_event_payload_check" check ((
      jsonb_typeof("payload") = 'object'
      and ("payload" - array['schemaVersion', 'changeType', 'productId', 'reason', 'trace']) = '{}'::jsonb
      and "payload"->>'schemaVersion' = '1'
      and "payload"->>'productId' = "entity_id"
      and "payload"->>'changeType' = "change_type"
      and (
        ("change_type" = 'delete' and "payload"->>'reason' = 'deleted')
        or (
          "change_type" = 'reconcile'
          and "payload"->>'reason' in ('created', 'updated', 'channel-linked', 'channel-unlinked')
        )
      )
    ) is true);`);

    this.addSql(`alter table "url_registry_outbox_event" add constraint "url_registry_outbox_event_delivery_state_check" check (
      (
        "status" = 'pending'
        and "claim_token" is null
        and "claimed_by" is null
        and "claimed_at" is null
        and "lease_expires_at" is null
        and "delivery_outcome" is null
        and "delivered_at" is null
        and "failed_at" is null
      )
      or (
        "status" = 'processing'
        and "claim_token" is not null
        and "claimed_by" is not null
        and "claimed_at" is not null
        and "lease_expires_at" is not null
        and "delivery_outcome" is null
        and "delivered_at" is null
        and "failed_at" is null
      )
      or (
        "status" = 'delivered'
        and "delivery_outcome" is not null
        and "delivered_at" is not null
        and "failed_at" is null
      )
      or (
        "status" = 'failed'
        and "delivery_outcome" is null
        and "delivered_at" is null
        and "failed_at" is not null
      )
    );`);

    this.addSql(`create function guard_url_registry_outbox_stream() returns trigger as $$
      begin
        if tg_op = 'DELETE' then
          raise exception 'URL registry outbox stream cannot be deleted' using errcode = '23514';
        end if;

        if new."id" is distinct from old."id"
          or new."source" is distinct from old."source"
          or new."entity_kind" is distinct from old."entity_kind"
          or new."entity_id" is distinct from old."entity_id"
          or new."market_code" is distinct from old."market_code"
          or new."created_at" is distinct from old."created_at"
          or new."deleted_at" is distinct from old."deleted_at" then
          raise exception 'URL registry outbox stream identity is immutable' using errcode = '23514';
        end if;

        if new."last_sequence" < old."last_sequence"
          or new."last_sequence" > old."last_sequence" + 1 then
          raise exception 'URL registry outbox stream sequence must advance by one' using errcode = '23514';
        end if;

        return new;
      end;
    $$ language plpgsql;`);

    this.addSql(`create trigger "url_registry_outbox_stream_guard"
      before update or delete on "url_registry_outbox_stream"
      for each row execute function guard_url_registry_outbox_stream();`);

    this.addSql(`create function guard_url_registry_outbox_event() returns trigger as $$
      begin
        if tg_op = 'DELETE' then
          raise exception 'URL registry outbox event cannot be deleted' using errcode = '23514';
        end if;

        if new."id" is distinct from old."id"
          or new."event_id" is distinct from old."event_id"
          or new."source" is distinct from old."source"
          or new."entity_kind" is distinct from old."entity_kind"
          or new."entity_id" is distinct from old."entity_id"
          or new."market_code" is distinct from old."market_code"
          or new."stream_sequence" is distinct from old."stream_sequence"
          or new."change_type" is distinct from old."change_type"
          or new."envelope_fingerprint" is distinct from old."envelope_fingerprint"
          or new."payload" is distinct from old."payload"
          or new."occurred_at" is distinct from old."occurred_at"
          or new."stream_id" is distinct from old."stream_id"
          or new."created_at" is distinct from old."created_at"
          or new."deleted_at" is distinct from old."deleted_at" then
          raise exception 'URL registry outbox event envelope is immutable' using errcode = '23514';
        end if;

        if old."status" in ('delivered', 'failed')
          and row(
            new."status",
            new."attempt_count",
            new."available_at",
            new."claim_token",
            new."claimed_by",
            new."claimed_at",
            new."lease_expires_at",
            new."last_error_code",
            new."delivery_outcome",
            new."delivered_at",
            new."failed_at"
          ) is distinct from row(
            old."status",
            old."attempt_count",
            old."available_at",
            old."claim_token",
            old."claimed_by",
            old."claimed_at",
            old."lease_expires_at",
            old."last_error_code",
            old."delivery_outcome",
            old."delivered_at",
            old."failed_at"
          ) then
          raise exception 'Terminal URL registry outbox event is immutable' using errcode = '23514';
        end if;

        if new."status" is distinct from old."status"
          and not (
            (old."status" = 'pending' and new."status" = 'processing')
            or (
              old."status" = 'processing'
              and new."status" in ('pending', 'delivered', 'failed')
            )
          ) then
          raise exception 'Invalid URL registry outbox delivery transition' using errcode = '23514';
        end if;

        return new;
      end;
    $$ language plpgsql;`);

    this.addSql(`create trigger "url_registry_outbox_event_guard"
      before update or delete on "url_registry_outbox_event"
      for each row execute function guard_url_registry_outbox_event();`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "url_registry_outbox_event" drop constraint if exists "url_registry_outbox_event_stream_id_foreign";`);

    this.addSql(`drop table if exists "url_registry_outbox_stream" cascade;`);

    this.addSql(`drop table if exists "url_registry_outbox_event" cascade;`);

    this.addSql(`drop function if exists guard_url_registry_outbox_event();`);
    this.addSql(`drop function if exists guard_url_registry_outbox_stream();`);
  }

}
