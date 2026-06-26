import { Link, useModernI18n } from '@modern-js/plugin-i18n/runtime';
import ShellFrame from '../shell-frame';
import { UltramodernRouteHead } from '../ultramodern-route-head';
import { VerticalShowcase } from '../vertical-components';
import { ultramodernUiMarker } from '../../ultramodern-build';

export default function ShellHome() {
  const { i18nInstance } = useModernI18n();
  const t = i18nInstance['t'].bind(i18nInstance);

  return (
    <ShellFrame>
      <UltramodernRouteHead />
      <section className="shell:mx-auto shell:grid shell:max-w-7xl shell:items-center shell:gap-8 shell:py-8 shell:md:grid-cols-[0.9fr_1.1fr] shell:lg:gap-14">
        <div className="shell:min-w-0">
          <p className="shell:text-xs shell:font-black shell:uppercase shell:tracking-[0.18em] shell:text-emerald-800">
            {t('shell.hero.eyebrow')}
          </p>
          <h1 className="shell:mt-3 shell:max-w-3xl shell:text-5xl shell:font-black shell:leading-none shell:tracking-normal shell:text-stone-950 shell:md:text-7xl">
            {t('shell.title')}
          </h1>
          <p className="shell:mt-5 shell:max-w-2xl shell:text-lg shell:leading-8 shell:text-stone-600">
            {t('shell.hero.lede')}
          </p>
          <div className="shell:mt-7 shell:flex shell:flex-wrap shell:gap-3">
            <Link
              className="shell:inline-flex shell:min-h-11 shell:items-center shell:justify-center shell:rounded-full shell:bg-emerald-800 shell:px-5 shell:font-bold shell:text-white shell:shadow-lg shell:shadow-stone-900/10"
              to="/"
            >
              {t('shell.hero.primary')}
            </Link>
            <span className="shell:inline-flex shell:min-h-11 shell:items-center shell:justify-center shell:rounded-full shell:border shell:border-stone-900/15 shell:bg-white/90 shell:px-5 shell:font-bold shell:text-stone-950 shell:shadow-lg shell:shadow-stone-900/10">
              {t('shell.hero.secondary')}
            </span>
          </div>
        </div>
        <div className="shell:rounded-3xl shell:bg-white/90 shell:p-6 shell:shadow-2xl shell:shadow-stone-900/15">
          <div className="shell:grid shell:gap-4 shell:sm:grid-cols-2">
            <article className="shell:rounded-2xl shell:bg-emerald-50 shell:p-5">
              <span className="shell:text-sm shell:font-black shell:uppercase shell:tracking-[0.16em] shell:text-emerald-800">
                {t('shell.hero.cardOneKicker')}
              </span>
              <strong className="shell:mt-3 shell:block shell:text-3xl shell:font-black shell:text-stone-950">
                0
              </strong>
              <p className="shell:mt-2 shell:text-sm shell:font-semibold shell:text-stone-600">
                {t('shell.hero.cardOne')}
              </p>
            </article>
            <article className="shell:rounded-2xl shell:bg-amber-50 shell:p-5">
              <span className="shell:text-sm shell:font-black shell:uppercase shell:tracking-[0.16em] shell:text-amber-800">
                {t('shell.hero.cardTwoKicker')}
              </span>
              <strong className="shell:mt-3 shell:block shell:text-3xl shell:font-black shell:text-stone-950">
                SSR
              </strong>
              <p className="shell:mt-2 shell:text-sm shell:font-semibold shell:text-stone-600">
                {t('shell.hero.cardTwo')}
              </p>
            </article>
          </div>
        </div>
      </section>
      <VerticalShowcase />
      <p className="shell:sr-only" data-testid="ultramodern-preset">
        presetUltramodern workspace
      </p>
      <p
        className="shell:sr-only"
        data-build-marker={ultramodernUiMarker.build}
        data-testid="ultramodern-ui-marker"
      >
        {ultramodernUiMarker.appId}:{ultramodernUiMarker.version}
      </p>
    </ShellFrame>
  );
}
