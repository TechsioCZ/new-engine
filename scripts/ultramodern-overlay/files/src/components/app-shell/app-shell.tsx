import { Link, useLocalizedLocation, useModernI18n } from '@modern-js/plugin-i18n/runtime';
import { LinkButton } from '@techsio/ui-kit/atoms/link-button';
import { Tooltip } from '@techsio/ui-kit/atoms/tooltip';
import { Header } from '@techsio/ui-kit/organisms/header';
import { Sidebar } from '@techsio/ui-kit/organisms/sidebar';
import type { CSSProperties, ReactNode } from 'react';

import { LanguageSwitcher } from './language-switcher';
import type { NavigationItem } from './navigation';
import { isActivePath, navigationItems } from './navigation';
import { ThemeSwitcher } from './theme-switcher';

type SidebarStyle = CSSProperties & {
  '--spacing-sidebar-offset': string;
};

// The sticky header and the panel offset share one token-based height.
const shellStyle: SidebarStyle = {
  '--spacing-sidebar-offset': 'var(--spacing-700)',
};
const headerStyle: CSSProperties = { height: 'var(--spacing-700)' };

function NavigationLink({ active, item }: { active: boolean; item: NavigationItem }) {
  const { t } = useModernI18n();
  const label = t(item.labelKey);

  return (
    <Sidebar.Context>
      {(api) => {
        const link = (
          <LinkButton
            aria-current={active ? 'page' : undefined}
            aria-label={label}
            as={Link}
            block
            icon={item.icon}
            size="sm"
            theme={active ? 'light' : 'unstyled'}
            to={item.to}
            variant="secondary"
          >
            <Sidebar.Label>{label}</Sidebar.Label>
          </LinkButton>
        );

        if (!api.isDesktop || api.isExpanded('start')) {
          return link;
        }

        return (
          <Tooltip content={label} dir={api.dir} placement={api.dir === 'rtl' ? 'left' : 'right'}>
            {link}
          </Tooltip>
        );
      }}
    </Sidebar.Context>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useModernI18n();
  const { canonical } = useLocalizedLocation();
  const navigationLabel = t('shell.nav.label');

  return (
    <Sidebar className="min-h-dvh flex-col" collapsible={{ start: 'icon' }} style={shellStyle}>
      <Header
        className="border-border-primary bg-base sticky top-0 z-10 w-full max-w-none border-b"
        style={headerStyle}
      >
        <div className="flex w-full items-center gap-200 px-200">
          <Sidebar.Trigger aria-label={t('shell.nav.toggle')} side="start" tooltip={t('shell.nav.toggle')} />
          <span className="text-fg-primary truncate font-semibold">{t('shell.title')}</span>
          <div className="ml-auto flex items-center gap-150">
            <LanguageSwitcher />
            <ThemeSwitcher />
          </div>
        </div>
      </Header>
      <div className="flex min-h-0 flex-1">
        <Sidebar.Panel aria-label={navigationLabel} side="start">
          <Sidebar.Header>
            <Sidebar.CloseTrigger aria-label={t('shell.nav.close')} />
          </Sidebar.Header>
          <Sidebar.Content>
            <Sidebar.Group>
              <Sidebar.Expanded>
                <Sidebar.GroupLabel>{navigationLabel}</Sidebar.GroupLabel>
              </Sidebar.Expanded>
              <Sidebar.GroupContent>
                <Sidebar.Menu>
                  {navigationItems.map((item) => (
                    <Sidebar.Item key={item.to}>
                      <NavigationLink active={isActivePath(canonical, item.to)} item={item} />
                    </Sidebar.Item>
                  ))}
                </Sidebar.Menu>
              </Sidebar.GroupContent>
            </Sidebar.Group>
          </Sidebar.Content>
          <Sidebar.Rail aria-label={t('shell.nav.toggle')} />
        </Sidebar.Panel>
        <Sidebar.Inset>{children}</Sidebar.Inset>
      </div>
    </Sidebar>
  );
}
