export type StandalonePagesErrorKind = "not_found" | "unavailable"
export type StandalonePagesHostLocales = Readonly<Record<string, string>>

const STANDALONE_ERROR_MESSAGES = {
  "cs-CZ": {
    not_found: "Stránka nebyla nalezena.",
    unavailable: "Obchod je dočasně nedostupný.",
  },
  "hu-HU": {
    not_found: "Az oldal nem található.",
    unavailable: "Az áruház átmenetileg nem érhető el.",
  },
  "ro-RO": {
    not_found: "Pagina nu a fost găsită.",
    unavailable: "Magazinul este indisponibil temporar.",
  },
  "sk-SK": {
    not_found: "Stránka sa nenašla.",
    unavailable: "Obchod je dočasne nedostupný.",
  },
} as const

export const createStandalonePagesLocaleBootstrap = (
  hostLocales: StandalonePagesHostLocales
) => {
  const serializedHostLocales = JSON.stringify(hostLocales).replaceAll(
    "<",
    "\\u003c"
  )
  return `(()=>{const locales=${serializedHostLocales};const locale=locales[window.location.hostname.toLowerCase()];if(locale){document.documentElement.lang=locale}})();`
}

export function StandalonePagesError({
  kind,
  status,
}: {
  kind: StandalonePagesErrorKind
  status: number
}) {
  return (
    <main
      className="mx-auto min-h-dvh w-full max-w-max-w p-500"
      data-status={status}
      role="alert"
    >
      <h1 className="font-bold text-3xl">{status}</h1>
      {Object.entries(STANDALONE_ERROR_MESSAGES).map(([locale, messages]) => (
        <p data-error-locale={locale} key={locale} lang={locale}>
          {messages[kind]}
        </p>
      ))}
      <style>{`
        [data-error-locale] {
          display: none;
        }
        [data-error-locale="sk-SK"] {
          display: block;
        }
        html:lang(cs-CZ) [data-error-locale="sk-SK"],
        html:lang(hu-HU) [data-error-locale="sk-SK"],
        html:lang(ro-RO) [data-error-locale="sk-SK"] {
          display: none;
        }
        html:lang(cs-CZ) [data-error-locale="cs-CZ"],
        html:lang(hu-HU) [data-error-locale="hu-HU"],
        html:lang(ro-RO) [data-error-locale="ro-RO"] {
          display: block;
        }
      `}</style>
    </main>
  )
}
