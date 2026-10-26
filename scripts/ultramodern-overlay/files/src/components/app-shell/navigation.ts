import type { IconType } from '@techsio/ui-kit/atoms/icon';

export interface NavigationItem {
  /** Language-agnostic route path; the i18n Link adds the language prefix. */
  readonly to: string;
  readonly icon: IconType;
  readonly labelKey: string;
}

// Sidebar destinations. Each `to` needs a route under src/routes/[lang].
export const navigationItems: readonly NavigationItem[] = [
  { icon: 'icon-[mdi--view-dashboard-outline]', labelKey: 'shell.nav.home', to: '/' },
  { icon: 'icon-[mdi--cog-outline]', labelKey: 'shell.nav.settings', to: '/settings' },
];

export const isActivePath = (canonicalPath: string, to: string) =>
  to === '/' ? canonicalPath === '/' : canonicalPath === to || canonicalPath.startsWith(`${to}/`);
