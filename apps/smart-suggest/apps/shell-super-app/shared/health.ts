import { DateTime } from 'effect';
import { ultramodernApiMarker } from './ultramodern-build';

export const getHealthPayload = () => ({
  buildId: ultramodernApiMarker.build,
  deployProfile: ultramodernApiMarker.deployProfile,
  environment: 'local',
  service: 'smart-suggest',
  timestamp: DateTime.formatIso(DateTime.nowUnsafe()),
  version: ultramodernApiMarker.version,
});
