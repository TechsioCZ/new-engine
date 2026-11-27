import { builtInBrands } from '@techsio/ui-kit/theme/built-in-brands';
import type { ModeSetting } from '@techsio/ui-kit/theme/theme-config';

// The app offers the kit's Figma brands and starts on Business. Every one of
// them (Business, Akros, N1) is light-only, so the mode toggle stays locked.
export const BRANDS = builtInBrands;
export const DEFAULT_BRAND = 'business';
export const DEFAULT_MODE: ModeSetting = 'light';
