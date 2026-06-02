import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260602123000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      do $$
      begin
        if not exists (
          select 1 from pg_constraint where conname = 'product_list_type_check'
        ) then
          alter table "product_list" add constraint "product_list_type_check" check ("type" in ('favorite', 'custom'));
        end if;
      end $$;
    `)
    this.addSql(`
      do $$
      begin
        if not exists (
          select 1 from pg_constraint where conname = 'product_list_item_quantity_check'
        ) then
          alter table "product_list_item" add constraint "product_list_item_quantity_check" check ("quantity" >= 1);
        end if;
      end $$;
    `)
    this.addSql(`
      do $$
      begin
        if not exists (
          select 1 from pg_constraint where conname = 'product_list_item_sort_order_check'
        ) then
          alter table "product_list_item" add constraint "product_list_item_sort_order_check" check ("sort_order" >= 0);
        end if;
      end $$;
    `)
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "product_list_item" drop constraint if exists "product_list_item_sort_order_check";`
    )
    this.addSql(
      `alter table if exists "product_list_item" drop constraint if exists "product_list_item_quantity_check";`
    )
    this.addSql(
      `alter table if exists "product_list" drop constraint if exists "product_list_type_check";`
    )
  }
}
