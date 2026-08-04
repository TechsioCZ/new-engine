import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260803134142 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "gls_config" drop constraint if exists gls_config_label_format_check;`);
    this.addSql(`alter table if exists "gls_config" drop column if exists "api_password", drop column if exists "sender_label", drop column if exists "eshop_id", drop column if exists "default_label_format", drop column if exists "default_label_offset", drop column if exists "cod_bank_account", drop column if exists "cod_bank_code", drop column if exists "cod_iban", drop column if exists "cod_swift";`);

    this.addSql(`alter table if exists "gls_config" add column if not exists "username" text null, add column if not exists "password" text null, add column if not exists "client_number" integer null, add column if not exists "country_code" text not null default 'SK', add column if not exists "webshop_engine" text null, add column if not exists "type_of_printer" text not null default 'A4_2x2', add column if not exists "print_position" integer not null default 1, add column if not exists "hide_phone_number_on_labels" boolean not null default false, add column if not exists "sender_house_number" text null, add column if not exists "sender_house_number_info" text null;`);
    this.addSql(`alter table if exists "gls_config" add constraint gls_config_country_code_check check(country_code in ('HR', 'CZ', 'HU', 'RO', 'SI', 'SK', 'RS'));`);
    this.addSql(`alter table if exists "gls_config" add constraint gls_config_printer_type_check check(type_of_printer in ('A4_2x2', 'A4_4x1', 'Connect', 'Thermo', 'ThermoZPL', 'ShipItThermoPdf', 'ThermoZPL_300DPI', 'ShipItThermoZpl'));`);
    this.addSql(`alter table if exists "gls_config" add constraint gls_config_print_position_check check(print_position between 1 and 4);`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "gls_config" drop constraint if exists gls_config_country_code_check;`);
    this.addSql(`alter table if exists "gls_config" drop constraint if exists gls_config_printer_type_check;`);
    this.addSql(`alter table if exists "gls_config" drop constraint if exists gls_config_print_position_check;`);
    this.addSql(`alter table if exists "gls_config" drop column if exists "username", drop column if exists "password", drop column if exists "client_number", drop column if exists "country_code", drop column if exists "webshop_engine", drop column if exists "type_of_printer", drop column if exists "print_position", drop column if exists "hide_phone_number_on_labels", drop column if exists "sender_house_number", drop column if exists "sender_house_number_info";`);

    this.addSql(`alter table if exists "gls_config" add column if not exists "api_password" text null, add column if not exists "sender_label" text null, add column if not exists "eshop_id" text null, add column if not exists "default_label_format" text not null default 'A6', add column if not exists "default_label_offset" integer not null default 0, add column if not exists "cod_bank_account" text null, add column if not exists "cod_bank_code" text null, add column if not exists "cod_iban" text null, add column if not exists "cod_swift" text null;`);
    this.addSql(`alter table if exists "gls_config" add constraint gls_config_label_format_check check(default_label_format in ('A6', 'A7'));`);
  }

}
