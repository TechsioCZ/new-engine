CREATE TABLE `smart_suggest_accept_events` (
	`id` text PRIMARY KEY NOT NULL,
	`request_id` text NOT NULL,
	`suggestion_id` text NOT NULL,
	`accepted_at` text NOT NULL,
	`tenant_json` text,
	`source_id` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `smart_suggest_accept_events_request_idx` ON `smart_suggest_accept_events` (`request_id`);--> statement-breakpoint
CREATE INDEX `smart_suggest_accept_events_source_idx` ON `smart_suggest_accept_events` (`source_id`);--> statement-breakpoint
CREATE TABLE `smart_suggest_address_records` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`country_code` text NOT NULL,
	`region` text,
	`city` text,
	`district` text,
	`street` text,
	`house_number` text,
	`orientation_number` text,
	`postal_code` text,
	`line_1` text,
	`line_2` text,
	`display_label` text NOT NULL,
	`search_label` text NOT NULL,
	`latitude` real,
	`longitude` real,
	`quality` real DEFAULT 0 NOT NULL,
	`attribution_json` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `smart_suggest_address_country_postal_idx` ON `smart_suggest_address_records` (`country_code`,`postal_code`);--> statement-breakpoint
CREATE INDEX `smart_suggest_address_source_idx` ON `smart_suggest_address_records` (`source_id`);--> statement-breakpoint
CREATE TABLE `smart_suggest_address_search_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`record_id` text NOT NULL,
	`country_code` text NOT NULL,
	`token` text NOT NULL,
	`prefix` text NOT NULL,
	`weight` real DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `smart_suggest_address_tokens_prefix_idx` ON `smart_suggest_address_search_tokens` (`country_code`,`prefix`);--> statement-breakpoint
CREATE INDEX `smart_suggest_address_tokens_record_idx` ON `smart_suggest_address_search_tokens` (`record_id`);--> statement-breakpoint
CREATE TABLE `smart_suggest_api_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`key_hash` text NOT NULL,
	`label` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`revoked_at` text
);
--> statement-breakpoint
CREATE INDEX `smart_suggest_api_keys_tenant_idx` ON `smart_suggest_api_keys` (`tenant_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `smart_suggest_api_keys_hash_idx` ON `smart_suggest_api_keys` (`key_hash`);--> statement-breakpoint
CREATE TABLE `smart_suggest_cache_entries` (
	`cache_key` text PRIMARY KEY NOT NULL,
	`query_hash` text NOT NULL,
	`kind` text NOT NULL,
	`country_code` text,
	`tenant_id` text,
	`language` text,
	`status` text NOT NULL,
	`payload_json` text NOT NULL,
	`cache_policy_json` text NOT NULL,
	`expires_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `smart_suggest_cache_query_hash_idx` ON `smart_suggest_cache_entries` (`query_hash`);--> statement-breakpoint
CREATE INDEX `smart_suggest_cache_tenant_country_idx` ON `smart_suggest_cache_entries` (`tenant_id`,`country_code`);--> statement-breakpoint
CREATE TABLE `smart_suggest_data_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`source_kind` text NOT NULL,
	`name` text NOT NULL,
	`country_code` text NOT NULL,
	`region` text,
	`dataset_version` text,
	`attribution_label` text NOT NULL,
	`attribution_url` text,
	`attribution_license` text,
	`cache_policy_json` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `smart_suggest_sources_country_idx` ON `smart_suggest_data_sources` (`country_code`);--> statement-breakpoint
CREATE TABLE `smart_suggest_import_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`status` text NOT NULL,
	`shard_country_code` text NOT NULL,
	`started_at` text NOT NULL,
	`completed_at` text,
	`total_rows` integer DEFAULT 0 NOT NULL,
	`inserted_rows` integer DEFAULT 0 NOT NULL,
	`failed_rows` integer DEFAULT 0 NOT NULL,
	`error_summary` text
);
--> statement-breakpoint
CREATE INDEX `smart_suggest_import_runs_source_idx` ON `smart_suggest_import_runs` (`source_id`);--> statement-breakpoint
CREATE INDEX `smart_suggest_import_runs_shard_idx` ON `smart_suggest_import_runs` (`shard_country_code`);--> statement-breakpoint
CREATE TABLE `smart_suggest_provider_events` (
	`id` text PRIMARY KEY NOT NULL,
	`request_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`tenant_id` text,
	`status` text NOT NULL,
	`latency_ms` integer,
	`error_code` text,
	`query_hash` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `smart_suggest_provider_events_request_idx` ON `smart_suggest_provider_events` (`request_id`);--> statement-breakpoint
CREATE INDEX `smart_suggest_provider_events_provider_idx` ON `smart_suggest_provider_events` (`provider_id`);--> statement-breakpoint
CREATE INDEX `smart_suggest_provider_events_query_hash_idx` ON `smart_suggest_provider_events` (`query_hash`);--> statement-breakpoint
CREATE TABLE `smart_suggest_tenants` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`allowed_origins_json` text DEFAULT '[]' NOT NULL,
	`provider_priority_json` text DEFAULT '[]' NOT NULL,
	`country_config_json` text DEFAULT '{}' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
