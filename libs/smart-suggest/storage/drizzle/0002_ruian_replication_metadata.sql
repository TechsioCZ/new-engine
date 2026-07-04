ALTER TABLE `smart_suggest_import_runs` ADD `import_kind` text;--> statement-breakpoint
ALTER TABLE `smart_suggest_import_runs` ADD `source_feed_id` text;--> statement-breakpoint
ALTER TABLE `smart_suggest_import_runs` ADD `source_uri` text;--> statement-breakpoint
ALTER TABLE `smart_suggest_import_runs` ADD `source_checksum_sha256` text;--> statement-breakpoint
ALTER TABLE `smart_suggest_import_runs` ADD `source_version` text;--> statement-breakpoint
ALTER TABLE `smart_suggest_import_runs` ADD `source_generated_at` text;--> statement-breakpoint
ALTER TABLE `smart_suggest_import_runs` ADD `source_valid_at` text;--> statement-breakpoint
ALTER TABLE `smart_suggest_import_runs` ADD `source_atom_entry_id` text;--> statement-breakpoint
ALTER TABLE `smart_suggest_import_runs` ADD `upserted_rows` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `smart_suggest_import_runs` ADD `tombstoned_rows` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `smart_suggest_import_runs` ADD `skipped_rows` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `smart_suggest_address_records` ADD `replication_status` text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `smart_suggest_address_records` ADD `search_visible` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `smart_suggest_address_records` ADD `ruian_address_place_code` text;--> statement-breakpoint
ALTER TABLE `smart_suggest_address_records` ADD `ruian_building_object_code` text;--> statement-breakpoint
ALTER TABLE `smart_suggest_address_records` ADD `ruian_district_code` text;--> statement-breakpoint
ALTER TABLE `smart_suggest_address_records` ADD `ruian_municipality_code` text;--> statement-breakpoint
ALTER TABLE `smart_suggest_address_records` ADD `ruian_municipality_district_code` text;--> statement-breakpoint
ALTER TABLE `smart_suggest_address_records` ADD `ruian_municipality_part_code` text;--> statement-breakpoint
ALTER TABLE `smart_suggest_address_records` ADD `ruian_postal_code` text;--> statement-breakpoint
ALTER TABLE `smart_suggest_address_records` ADD `ruian_region_code` text;--> statement-breakpoint
ALTER TABLE `smart_suggest_address_records` ADD `ruian_street_code` text;--> statement-breakpoint
ALTER TABLE `smart_suggest_address_records` ADD `source_record_type` text;--> statement-breakpoint
ALTER TABLE `smart_suggest_address_records` ADD `source_record_id` text;--> statement-breakpoint
ALTER TABLE `smart_suggest_address_records` ADD `source_feed_id` text;--> statement-breakpoint
ALTER TABLE `smart_suggest_address_records` ADD `source_uri` text;--> statement-breakpoint
ALTER TABLE `smart_suggest_address_records` ADD `source_checksum_sha256` text;--> statement-breakpoint
ALTER TABLE `smart_suggest_address_records` ADD `source_version` text;--> statement-breakpoint
ALTER TABLE `smart_suggest_address_records` ADD `source_generated_at` text;--> statement-breakpoint
ALTER TABLE `smart_suggest_address_records` ADD `source_valid_at` text;--> statement-breakpoint
ALTER TABLE `smart_suggest_address_records` ADD `source_atom_entry_id` text;--> statement-breakpoint
ALTER TABLE `smart_suggest_address_records` ADD `source_file_kind` text;--> statement-breakpoint
ALTER TABLE `smart_suggest_address_records` ADD `source_valid_from` text;--> statement-breakpoint
ALTER TABLE `smart_suggest_address_records` ADD `source_valid_to` text;--> statement-breakpoint
ALTER TABLE `smart_suggest_address_records` ADD `source_transaction_id` text;--> statement-breakpoint
ALTER TABLE `smart_suggest_address_records` ADD `source_change_proposal_global_id` text;--> statement-breakpoint
ALTER TABLE `smart_suggest_address_records` ADD `source_status` text;--> statement-breakpoint
ALTER TABLE `smart_suggest_address_records` ADD `source_invalid` integer;--> statement-breakpoint
ALTER TABLE `smart_suggest_address_records` ADD `invalid_reason` text;--> statement-breakpoint
ALTER TABLE `smart_suggest_address_records` ADD `last_import_run_id` text;--> statement-breakpoint
ALTER TABLE `smart_suggest_address_records` ADD `tombstoned_at` text;--> statement-breakpoint
ALTER TABLE `smart_suggest_address_records` ADD `tombstone_reason` text;--> statement-breakpoint
CREATE INDEX `smart_suggest_address_country_visible_idx` ON `smart_suggest_address_records` (`country_code`,`search_visible`);--> statement-breakpoint
CREATE UNIQUE INDEX `smart_suggest_address_source_record_idx` ON `smart_suggest_address_records` (`source_id`,`source_record_type`,`source_record_id`);--> statement-breakpoint
CREATE INDEX `smart_suggest_address_ruian_address_place_idx` ON `smart_suggest_address_records` (`ruian_address_place_code`);--> statement-breakpoint
CREATE INDEX `smart_suggest_address_ruian_region_idx` ON `smart_suggest_address_records` (`ruian_region_code`);--> statement-breakpoint
CREATE TABLE `smart_suggest_address_tombstones` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`country_code` text NOT NULL,
	`deleted_at` text,
	`reason` text,
	`ruian_address_place_code` text,
	`ruian_building_object_code` text,
	`ruian_district_code` text,
	`ruian_municipality_code` text,
	`ruian_municipality_district_code` text,
	`ruian_municipality_part_code` text,
	`ruian_postal_code` text,
	`ruian_region_code` text,
	`ruian_street_code` text,
	`source_record_type` text,
	`source_record_id` text,
	`source_feed_id` text,
	`source_uri` text,
	`source_checksum_sha256` text,
	`source_version` text,
	`source_generated_at` text,
	`source_valid_at` text,
	`source_atom_entry_id` text,
	`source_file_kind` text,
	`last_import_run_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `smart_suggest_data_sources`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `smart_suggest_address_tombstones_source_idx` ON `smart_suggest_address_tombstones` (`source_id`);--> statement-breakpoint
CREATE INDEX `smart_suggest_address_tombstones_ruian_idx` ON `smart_suggest_address_tombstones` (`ruian_address_place_code`);
