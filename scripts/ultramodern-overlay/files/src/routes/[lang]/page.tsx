import { useModernI18n } from '@modern-js/plugin-i18n/runtime';
import { Badge } from '@techsio/ui-kit/atoms/badge';

import { ultramodernUiMarker } from '../../ultramodern-build';
import { UltramodernRouteHead } from '../ultramodern-route-head';
import { VerticalShowcase } from '../vertical-components';

export default function ShellHome() {
  const { t } = useModernI18n();

  return (
    <main className="grid content-start gap-400 p-400">
      <UltramodernRouteHead />
      <section className="grid max-w-2xl gap-200">
        <Badge className="justify-self-start" variant="primary">
          {t('shell.home.badge')}
        </Badge>
        <h1 className="text-4xl font-bold">{t('shell.home.title')}</h1>
        <p className="text-fg-secondary text-lg">{t('shell.home.lede')}</p>
      </section>
      <VerticalShowcase />
      <p className="shell:sr-only" data-testid="ultramodern-preset">
        presetUltramodern workspace
      </p>
      <p className="shell:sr-only" data-build-marker={ultramodernUiMarker.build} data-testid="ultramodern-ui-marker">
        {ultramodernUiMarker.appId}:{ultramodernUiMarker.version}
      </p>
    </main>
  );
}
