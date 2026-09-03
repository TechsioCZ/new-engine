"use client"

import { useTranslations } from "next-intl"
import { HerbatikaBreadcrumb } from "@/components/herbatika-breadcrumb"
import { ClaimForm } from "./claim-form"

export function ClaimsPage() {
  const t = useTranslations("claims")

  return (
    <main className="w-full bg-base font-rubik">
      <div className="mx-auto flex w-full max-w-max-w flex-col gap-500 p-300 md:p-500 2xl:p-600">
        <HerbatikaBreadcrumb
          items={[
            {
              label: t("breadcrumb_home"),
              href: "/",
              icon: "token-icon-home",
            },
            { label: t("breadcrumb_current") },
          ]}
        />
        <section className="mx-auto grid w-full max-w-max-w gap-600 lg:grid-cols-2">
          <div className="flex flex-col gap-500">
            <div className="flex flex-col gap-200">
              <h1 className="font-bold text-4xl text-fg-primary leading-tight">
                {t("title")}
              </h1>
              <p className="font-verdana text-fg-secondary leading-relaxed">
                {t("intro")}
              </p>
            </div>
            <ClaimForm />
          </div>
          <aside className="flex h-fit flex-col gap-300 rounded-lg border border-border-base bg-surface p-400">
            <h2 className="font-bold text-fg-primary text-xl">
              {t("how_title")}
            </h2>
            <ol className="list-decimal space-y-200 pl-400 text-fg-secondary">
              <li>{t("how_step_type")}</li>
              <li>{t("how_step_verify")}</li>
              <li>{t("how_step_items")}</li>
              <li>{t("how_step_submit")}</li>
            </ol>
            <p className="text-fg-secondary text-sm">{t("manual_note")}</p>
          </aside>
        </section>
      </div>
    </main>
  )
}
