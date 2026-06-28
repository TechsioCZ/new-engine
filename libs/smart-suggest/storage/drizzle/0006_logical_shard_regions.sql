DROP INDEX IF EXISTS `smart_suggest_shard_registry_binding_idx`;
--> statement-breakpoint
DROP INDEX IF EXISTS `smart_suggest_shard_registry_region_idx`;
--> statement-breakpoint
CREATE INDEX `smart_suggest_shard_registry_binding_idx` ON `smart_suggest_shard_registry` (`binding_name`);
--> statement-breakpoint
CREATE INDEX `smart_suggest_shard_registry_region_idx` ON `smart_suggest_shard_registry` (`country_code`,`region_kind`,`region_code`);
--> statement-breakpoint
CREATE UNIQUE INDEX `smart_suggest_shard_registry_active_region_idx` ON `smart_suggest_shard_registry` (`country_code`,`region_kind`,`region_code`) WHERE `state` = 'active';
--> statement-breakpoint
CREATE INDEX `smart_suggest_shard_registry_region_state_idx` ON `smart_suggest_shard_registry` (`country_code`,`region_kind`,`region_code`,`state`);
