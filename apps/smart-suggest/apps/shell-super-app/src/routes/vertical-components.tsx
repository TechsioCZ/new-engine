import { useLocalizedLocation, useModernI18n } from '@modern-js/plugin-i18n/runtime';

export const Header = () => {
  const { i18nInstance, language } = useModernI18n();
  const t = i18nInstance['t'].bind(i18nInstance);
  const { alternates } = useLocalizedLocation();
  const homeHref = alternates[language] ?? '/';

  return (
    <header
      className="shell:flex shell:min-w-0 shell:flex-wrap shell:items-center shell:gap-x-8 shell:gap-y-2 shell:md:flex-1"
      data-modern-boundary-id="shellSuperApp"
      data-modern-mf-expose="shell/Header"
    >
      <a
        className="shell:whitespace-nowrap shell:text-xl shell:font-black shell:tracking-normal shell:text-stone-950 shell:no-underline"
        href={homeHref}
      >
        {t('shell.title')}
      </a>
    </header>
  );
};
