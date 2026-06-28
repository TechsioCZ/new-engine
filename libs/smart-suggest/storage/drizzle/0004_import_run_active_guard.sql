CREATE UNIQUE INDEX `smart_suggest_import_runs_active_source_shard_idx`
ON `smart_suggest_import_runs` (`source_id`, `shard_country_code`)
WHERE `status` = 'running' AND `import_kind` IN ('baseline', 'delta');
