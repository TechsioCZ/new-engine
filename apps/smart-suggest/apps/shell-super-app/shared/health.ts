import { DateTime } from 'effect';
import type { StorageHealth } from '@techsio/smart-suggest-storage';
import { ultramodernApiMarker } from './ultramodern-build';

export const getHealthPayload = (storage?: StorageHealth) => ({
  buildId: ultramodernApiMarker.build,
  db: storage ?? {
    checkedAt: DateTime.formatIso(DateTime.nowUnsafe()),
    error: 'D1 binding is not configured for this local shell.',
    ok: false,
  },
  deployProfile: ultramodernApiMarker.deployProfile,
  environment: 'local',
  service: 'smart-suggest',
  timestamp: DateTime.formatIso(DateTime.nowUnsafe()),
  version: ultramodernApiMarker.version,
});
