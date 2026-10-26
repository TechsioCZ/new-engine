import { useLocalizedLocation, useModernI18n } from '@modern-js/plugin-i18n/runtime';
import { useNavigate } from '@modern-js/plugin-tanstack/runtime';
import { SelectTemplate } from '@techsio/ui-kit/templates/select';

const languages = ['en', 'cs'] as const;
const visuallyHidden = { className: 'sr-only' };

export function LanguageSwitcher() {
  const { language, t } = useModernI18n();
  const { alternates } = useLocalizedLocation();
  const navigate = useNavigate();

  const items = languages.map((value) => ({ label: t(`shell.language.${value}`), value }));

  return (
    <SelectTemplate
      items={items}
      label={t('shell.language.switcher')}
      labelProps={visuallyHidden}
      onValueChange={({ value }) => {
        const [next] = value;
        const target = next === undefined ? undefined : alternates[next];
        if (target !== undefined) {
          void navigate({ to: target });
        }
      }}
      size="sm"
      value={[language]}
    />
  );
}
