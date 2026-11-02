import { useModernI18n } from '@modern-js/plugin-i18n/runtime';
import { ActionIcon } from '@techsio/ui-kit/atoms/action-icon';
import { Tooltip } from '@techsio/ui-kit/atoms/tooltip';
import { SelectTemplate } from '@techsio/ui-kit/templates/select';
import { brandSupportsDark, isBrandKey } from '@techsio/ui-kit/theme/theme-config';
import { useAppTheme } from '@techsio/ui-kit/theme/theme-provider';

import { DEFAULT_BRAND } from './theme';

const visuallyHidden = { className: 'sr-only' };

export function ThemeSwitcher() {
  const { t } = useModernI18n();
  const { brand, brands, mounted, resolvedMode, setBrand, setMode } = useAppTheme();

  // The stored brand is only known in the browser; render the default until
  // mount so the first client render matches the server HTML.
  const shownBrand = mounted ? brand : DEFAULT_BRAND;
  const brandItems = brands.map((key) => ({ label: t(`shell.theme.brands.${key}`), value: key }));
  const supportsDark = brandSupportsDark(shownBrand);
  const isDark = mounted && resolvedMode === 'dark';
  const modeLabel = isDark ? t('shell.theme.useLight') : t('shell.theme.useDark');

  return (
    <div className="flex items-center gap-100">
      <SelectTemplate
        items={brandItems}
        label={t('shell.theme.brand')}
        labelProps={visuallyHidden}
        onValueChange={({ value }) => {
          const [next] = value;
          if (next !== undefined && isBrandKey(next)) {
            setBrand(next);
          }
        }}
        size="sm"
        value={[shownBrand]}
      />
      <Tooltip content={supportsDark ? modeLabel : t('shell.theme.lightOnly')}>
        <ActionIcon
          aria-label={supportsDark ? modeLabel : t('shell.theme.lightOnly')}
          disabled={!supportsDark}
          icon={isDark ? 'icon-[mdi--weather-sunny]' : 'icon-[mdi--weather-night]'}
          onClick={() => setMode(isDark ? 'light' : 'dark')}
        />
      </Tooltip>
    </div>
  );
}
