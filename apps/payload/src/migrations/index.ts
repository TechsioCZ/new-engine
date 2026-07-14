import * as migration_20260125_215246_baseline from './20260125_215246_baseline';
import * as migration_20260714_142450_add_hero_carousel_internal_title from './20260714_142450_add_hero_carousel_internal_title';

export const migrations = [
  {
    up: migration_20260125_215246_baseline.up,
    down: migration_20260125_215246_baseline.down,
    name: '20260125_215246_baseline',
  },
  {
    up: migration_20260714_142450_add_hero_carousel_internal_title.up,
    down: migration_20260714_142450_add_hero_carousel_internal_title.down,
    name: '20260714_142450_add_hero_carousel_internal_title'
  },
];
