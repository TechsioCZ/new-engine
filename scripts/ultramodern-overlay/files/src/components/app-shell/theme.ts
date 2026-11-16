import type { BrandKey, ModeSetting } from '@techsio/ui-kit/theme/theme-config';

// The app starts on the Business brand. Every shipped brand (Business, Akros,
// N1) is light-only, so the mode toggle stays locked to light.
export const DEFAULT_BRAND: BrandKey = 'business';
export const DEFAULT_MODE: ModeSetting = 'light';
