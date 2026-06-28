CREATE VIRTUAL TABLE IF NOT EXISTS `smart_suggest_address_search_fts` USING fts5(
	`record_id` UNINDEXED,
	`country_code` UNINDEXED,
	`display_label`,
	`search_label`,
	`street`,
	`city`,
	`district`,
	`postal_code`,
	`house_number`,
	`orientation_number`,
	tokenize = 'unicode61 remove_diacritics 2',
	prefix = '2 3 4 5 6 7 8 9 10 11 12 13 14 15 16'
);
