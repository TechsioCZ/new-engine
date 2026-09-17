import { useTranslations } from "next-intl"
import Link from "next/link"

export default function NotFound() {
  const t = useTranslations("notFound")

  return (
    <main className="flex min-h-[60dvh] flex-col items-center justify-center px-400 py-800 text-center">
      <h1 className="text-8xl font-bold text-primary">404</h1>
      <p className="mt-300 text-xl text-fg-secondary">{t("message")}</p>
      <Link
        className="mt-500 inline-flex items-center rounded-full bg-primary px-500 py-200 text-sm font-medium text-fg-reverse transition-colors hover:bg-primary-hover active:bg-primary-active"
        href="/"
      >
        {t("backHome")}
      </Link>
    </main>
  )
}
