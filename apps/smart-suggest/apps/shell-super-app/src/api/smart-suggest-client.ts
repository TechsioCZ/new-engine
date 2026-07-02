import { makeEffectHttpApiClient, runEffectRequest } from '@modern-js/plugin-bff/effect-client';
import type { EffectHttpApiClientOptions } from '@modern-js/plugin-bff/effect-client';
import { SmartSuggestHttpApi } from '../../shared/api';

export { runEffectRequest, SmartSuggestHttpApi };
export type { EffectHttpApiClientOptions };

export const createSmartSuggestApiClient = (options?: EffectHttpApiClientOptions) =>
  makeEffectHttpApiClient(SmartSuggestHttpApi, options);
