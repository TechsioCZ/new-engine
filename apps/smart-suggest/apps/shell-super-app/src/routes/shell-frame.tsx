import { useLocalizedLocation, useModernI18n } from '@modern-js/plugin-i18n/runtime';
import type { ReactNode } from 'react';

interface ShellFrameProps {
  children: ReactNode;
}

export default function ShellFrame({ children }: ShellFrameProps) {
  const { i18nInstance, language } = useModernI18n();
  const t = i18nInstance['t'].bind(i18nInstance);
  const { alternates } = useLocalizedLocation();

  return (
    <main className="shell:min-h-screen shell:overflow-x-hidden shell:bg-[#f5f7f2] shell:px-4 shell:py-4 shell:scheme-light shell:text-um-foreground shell:sm:px-6 shell:lg:px-12">
      <div className="shell:mx-auto shell:flex shell:max-w-6xl shell:justify-end">
        <label className="shell:sr-only" htmlFor="smart-suggest-language">
          {t('shell.language.switcher')}
        </label>
        <select
          aria-label={t('shell.language.switcher')}
          className="shell:min-h-11 shell:w-36 shell:cursor-pointer shell:rounded-lg shell:border shell:border-stone-900/10 shell:bg-white shell:px-3 shell:text-sm shell:font-black shell:text-stone-950 shell:shadow-sm shell:shadow-stone-900/5 shell:focus-visible:outline-3 shell:focus-visible:outline-offset-2 shell:focus-visible:outline-emerald-700/40"
          id="smart-suggest-language"
          name="language"
          onChange={(event) => {
            const nextLanguage = event.currentTarget.value;
            const targetHref = alternates[nextLanguage];
            if (targetHref !== undefined) {
              window.location.assign(targetHref);
            }
          }}
          value={language}
        >
          <option value="en">{t('shell.language.en')}</option>
          <option value="cs">{t('shell.language.cs')}</option>
        </select>
      </div>
      {children}
    </main>
  );
}
