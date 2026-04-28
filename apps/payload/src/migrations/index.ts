import * as migration_20260125_215246_baseline from './20260125_215246_baseline';

export const migrations = [
  {
    up: migration_20260125_215246_baseline.up,
    down: migration_20260125_215246_baseline.down,
    name: '20260125_215246_baseline'
  },
];
