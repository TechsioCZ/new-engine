import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260820143000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table "url_registry_outbox_event"
      drop constraint if exists "url_registry_outbox_event_payload_check";`)
    this.addSql(`alter table "url_registry_outbox_event"
      add constraint "url_registry_outbox_event_payload_check" check ((
        jsonb_typeof("payload") = 'object'
        and "payload"->>'schemaVersion' = '1'
        and "payload"->>'changeType' = "change_type"
        and (
          (
            "entity_kind" = 'product'
            and ("payload" - array[
              'schemaVersion', 'changeType', 'productId', 'reason', 'trace',
              'assignment', 'sourceVersion'
            ]) = '{}'::jsonb
            and "payload"->>'productId' = "entity_id"
            and (
              ("change_type" = 'delete' and "payload"->>'reason' = 'deleted')
              or (
                "change_type" = 'reconcile'
                and "payload"->>'reason' in (
                  'created', 'updated', 'channel-linked', 'channel-unlinked',
                  'translation-invalidated'
                )
              )
            )
          )
          or (
            "entity_kind" in ('category', 'brand', 'collection')
            and "change_type" = 'reconcile'
            and ("payload" - array[
              'schemaVersion', 'changeType', 'entityKind', 'entityId',
              'reason', 'trace', 'assignment', 'sourceVersion'
            ]) = '{}'::jsonb
            and "payload"->>'entityKind' = "entity_kind"
            and "payload"->>'entityId' = "entity_id"
            and "payload"->>'reason' in (
              'assignment-upsert', 'assignment-backfill'
            )
          )
        )
      ) is true);`)
  }

  override async down(): Promise<void> {
    // Expand-only: restoring the product-only constraint can reject existing catalog rows.
  }
}
