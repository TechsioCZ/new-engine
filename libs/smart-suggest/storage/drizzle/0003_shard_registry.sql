CREATE TABLE `smart_suggest_shard_registry` (
	`shard_id` text PRIMARY KEY NOT NULL,
	`country_code` text NOT NULL,
	`region_kind` text NOT NULL,
	`region_code` text NOT NULL,
	`region_name` text NOT NULL,
	`postal_prefixes_json` text DEFAULT '[]' NOT NULL,
	`municipality_codes_json` text DEFAULT '[]' NOT NULL,
	`municipality_hints_json` text DEFAULT '[]' NOT NULL,
	`binding_name` text NOT NULL,
	`import_version` text,
	`state` text DEFAULT 'standby' NOT NULL,
	`row_count` integer DEFAULT 0 NOT NULL,
	`estimated_size_bytes` integer,
	`source_freshness_at` text,
	`last_import_completed_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `smart_suggest_shard_registry_binding_idx` ON `smart_suggest_shard_registry` (`binding_name`);--> statement-breakpoint
CREATE INDEX `smart_suggest_shard_registry_country_state_idx` ON `smart_suggest_shard_registry` (`country_code`,`state`);--> statement-breakpoint
CREATE INDEX `smart_suggest_shard_registry_region_idx` ON `smart_suggest_shard_registry` (`country_code`,`region_kind`,`region_code`);
