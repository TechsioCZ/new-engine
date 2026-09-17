import Link from "next/link"

const MESSAGES = {
  "cs-CZ": { message: "Stránka nebyla nalezena.", backHome: "Zpět na úvod" },
  "hu-HU": { message: "Az oldal nem található.", backHome: "Vissza a főoldalra" },
  "ro-RO": { message: "Pagina nu a fost găsită.", backHome: "Înapoi acasă" },
  "sk-SK": { message: "Stránka sa nenašla.", backHome: "Späť na úvod" },
} as const

type SupportedLocale = keyof typeof MESSAGES
const DEFAULT_LOCALE: SupportedLocale = "sk-SK"

function getLocaleMessages(htmlLang: string | undefined) {
  if (htmlLang && htmlLang in MESSAGES) {
    return MESSAGES[htmlLang as SupportedLocale]
  }
  return MESSAGES[DEFAULT_LOCALE]
}

export default function NotFound() {
  // The root layout sets <html lang=...> based on the resolved market,
  // but we cannot read it server-side. Default to sk-SK (matches pages/404.tsx).
  const t = getLocaleMessages(undefined)

  return (
    <main className="flex min-h-[60dvh] flex-col items-center justify-center px-400 py-800 text-center">
      <h1 className="text-8xl font-bold text-primary">404</h1>
      <p className="mt-300 text-xl text-fg-secondary">{t.message}</p>
      <Link
        className="mt-500 inline-flex items-center rounded-full bg-primary px-500 py-200 text-sm font-medium text-fg-reverse transition-colors hover:bg-primary-hover active:bg-primary-active"
        href="/"
      >
        {t.backHome}
      </Link>
    </main>
  )
}
