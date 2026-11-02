import { useModernI18n } from '@modern-js/plugin-i18n/runtime';

import { UltramodernRouteHead } from '../../ultramodern-route-head';

export default function SettingsPage() {
  const { t } = useModernI18n();

  return (
    <main className="grid content-start gap-200 p-400">
      <UltramodernRouteHead />
      <h1 className="text-3xl font-bold">{t('shell.settings.title')}</h1>
      <p className="text-fg-secondary max-w-2xl">{t('shell.settings.lede')}</p>
    </main>
  );
}
