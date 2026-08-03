"use client"
import { Icon } from "@techsio/ui-kit/atoms/icon"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import { Accordion } from "@techsio/ui-kit/molecules/accordion"
import type { ReactNode } from "react"

import { FaqItemHeader } from "@/components/faq/faq-item-header"

interface FaqItem {
  id: string
  value: string
  title: ReactNode
  content: ReactNode
}

const faqData: FaqItem[] = [
  {
    id: "faq-1",
    value: "implementation-time",
    title: (
      <FaqItemHeader
        icon="icon-[mdi--clock-outline]"
        iconStyle="text-primary text-md bg-primary/10"
        tag="Implementace"
        tagStyle="bg-primary/10 text-primary"
        title="Jak dlouho trvá implementace custom e-commerce řešení?"
      />
    ),
    content: (
      <div className="space-y-content-sections pl-faq-primary">
        <div className="rounded-lg border border-border bg-surface p-card-padding">
          <div className="flex items-start gap-250">
            <Icon
              className="mt-icon-align flex-shrink-0 text-info"
              icon="icon-[mdi--information-outline]"
              size="md"
            />
            <div>
              <h4 className="font-medium text-fg-primary">
                Pevný termín realizace
              </h4>
              <p className="text-fg-secondary text-sm leading-relaxed">
                Doba implementace se odvíjí od rozsahu projektu a požadovaných
                úprav.{" "}
                <strong className="text-fg-primary">
                  V rámci smluvní dokumentace vždy stanovujeme pevný termín
                  realizace, který důsledně dodržujeme.
                </strong>{" "}
                Vaše spokojenost a dodržení termínů je pro nás prioritou.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface p-card-padding">
          <h4 className="mb-250 flex items-center gap-200 font-medium text-fg-primary">
            <Icon
              color="secondary"
              icon="icon-[mdi--format-list-numbered]"
              size="md"
            />
            Klíčové fáze implementace
          </h4>
          <div className="space-y-200">
            <div className="flex items-center gap-250">
              <div className="flex h-450 w-450 flex-shrink-0 items-center justify-center rounded-full bg-secondary/10">
                <span className="font-medium text-secondary text-sm">1</span>
              </div>
              <span className="text-fg-secondary">Analýza potřeb</span>
            </div>
            <div className="flex items-center gap-250">
              <div className="flex h-450 w-450 flex-shrink-0 items-center justify-center rounded-full bg-secondary/10">
                <span className="font-medium text-secondary text-sm">2</span>
              </div>
              <span className="text-fg-secondary">Příprava řešení</span>
            </div>
            <div className="flex items-center gap-250">
              <div className="flex h-450 w-450 flex-shrink-0 items-center justify-center rounded-full bg-secondary/10">
                <span className="font-medium text-secondary text-sm">3</span>
              </div>
              <span className="text-fg-secondary">Vývoj</span>
            </div>
            <div className="flex items-center gap-250">
              <div className="flex h-450 w-450 flex-shrink-0 items-center justify-center rounded-full bg-secondary/10">
                <span className="font-medium text-secondary text-sm">4</span>
              </div>
              <span className="text-fg-secondary">Testování</span>
            </div>
            <div className="flex items-center gap-250">
              <div className="flex h-450 w-450 flex-shrink-0 items-center justify-center rounded-full bg-secondary/10">
                <span className="font-medium text-secondary text-sm">5</span>
              </div>
              <span className="text-fg-secondary">Nasazení</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-success/20 bg-success/5 p-card-padding">
          <div className="flex items-start gap-250">
            <Icon
              className="mt-icon-align flex-shrink-0"
              color="success"
              icon="icon-[mdi--check-circle-outline]"
              size="md"
            />
            <div>
              <h4 className="mb--title-bottom font-medium text-success">
                Transparentní komunikace
              </h4>
              <p className="text-fg-secondary text-sm leading-relaxed">
                Během celého procesu klademe důraz na transparentní komunikaci a
                pravidelné aktualizace o postupu projektu.{" "}
                <strong className="text-fg-primary">
                  Budete vždy vědět, kde se nacházíme a co nás čeká v dalším
                  kroku.
                </strong>
              </p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "faq-2",
    value: "migration-process",
    title: (
      <FaqItemHeader
        icon="icon-[mdi--database-arrow-right]"
        iconStyle="text-info text-md bg-info/10"
        tag="Migrace dat"
        tagStyle="bg-info/10 text-info"
        title="Jak probíhá přechod ze současného e-shopu na vaše řešení?"
      />
    ),
    content: (
      <div className="space-y-content-sections pl-faq-primary">
        <div className="rounded-lg border border-info/20 bg-info/5 p-card-padding">
          <div className="flex items-start gap-250">
            <Icon
              className="mt-icon-align flex-shrink-0 text-info"
              icon="icon-[mdi--check-circle-outline]"
              size="md"
            />
            <div>
              <h4 className="mb--title-bottom font-medium text-info">
                Kompletní import dat
              </h4>
              <p className="text-fg-secondary text-sm leading-relaxed">
                Zajistíme převod všech produktových dat, popisů, kategorií,
                parametrů, cen a fotografií.
                <strong className="text-fg-primary">
                  {" "}
                  Zachováme také data registrovaných zákazníků včetně jejich
                  přihlašovacích údajů
                </strong>
                , což zajistí bezproblémový přechod pro vaše klienty.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-card-padding md:grid-cols-2">
          <div className="rounded-lg border border-border bg-surface p-card-padding">
            <div className="flex items-start gap-250">
              <Icon
                className="mt-icon-align flex-shrink-0"
                color="secondary"
                icon="icon-[mdi--package-variant]"
                size="md"
              />
              <div>
                <h4 className="mb--title-bottom font-medium text-fg-primary">
                  Produktová data
                </h4>
                <ul className="space-y-100 text-fg-secondary text-sm">
                  <li>• Popisy a specifikace</li>
                  <li>• Kategorie a parametry</li>
                  <li>• Ceny a dostupnost</li>
                  <li>• Fotografie a média</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-surface p-card-padding">
            <div className="flex items-start gap-250">
              <Icon
                className="mt-icon-align flex-shrink-0 text-tertiary"
                icon="icon-[mdi--account-group]"
                size="md"
              />
              <div>
                <h4 className="mb--title-bottom font-medium text-fg-primary">
                  Zákaznická data
                </h4>
                <ul className="space-y-100 text-fg-secondary text-sm">
                  <li>• Registrační údaje</li>
                  <li>• Přihlašovací informace</li>
                  <li>• Historie objednávek</li>
                  <li>• Preference a nastavení</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-warning/20 bg-warning/5 p-card-padding">
          <div className="flex items-start gap-250">
            <Icon
              className="mt-icon-align flex-shrink-0"
              color="warning"
              icon="icon-[mdi--shield-check]"
              size="md"
            />
            <div>
              <h4 className="mb--title-bottom font-medium text-fg-primary">
                Bezpečný proces migrace
              </h4>
              <p className="mb-200 text-fg-secondary text-sm">
                Před samotnou migrací provedeme analýzu kompatibility dat.
                E-shop nejprve spustíme na testovací doméně, kde můžete vše
                důkladně otestovat před ostrým spuštěním.
              </p>
              <div className="grid gap-250 md:grid-cols-3">
                <div className="text-center">
                  <div className="mx-auto mb--title-bottom flex h-450 w-450 items-center justify-center rounded-full bg-warning/10">
                    <span className="font-medium text-fg-secondary text-md">
                      1
                    </span>
                  </div>
                  <p className="font-medium text-fg-secondary text-xs">
                    Analýza kompatibility
                  </p>
                </div>
                <div className="text-center">
                  <div className="mx-auto mb--title-bottom flex h-450 w-450 items-center justify-center rounded-full bg-warning/10">
                    <span className="font-medium text-fg-secondary text-md">
                      2
                    </span>
                  </div>
                  <p className="font-medium text-fg-secondary text-xs">
                    Testovací prostředí
                  </p>
                </div>
                <div className="text-center">
                  <div className="mx-auto mb--title-bottom flex h-450 w-450 items-center justify-center rounded-full bg-warning/10">
                    <span className="font-medium text-fg-secondary text-md">
                      3
                    </span>
                  </div>
                  <p className="font-medium text-fg-secondary text-xs">
                    Ostrý přechod
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "faq-3",
    value: "modular-development",
    title: (
      <FaqItemHeader
        icon="icon-[mdi--puzzle-outline]"
        iconStyle="text-success text-md bg-success/10"
        tag="Modularita"
        tagStyle="bg-success/10 text-success"
        title="Můžeme začít s základní verzí a postupně rozšiřovat funkcionalitu?"
      />
    ),
    content: (
      <div className="space-y-content-sections pl-faq-primary">
        <div className="rounded-lg border border-success/20 bg-success/5 p-card-padding">
          <div className="flex items-start gap-250">
            <Icon
              className="mt-icon-align flex-shrink-0"
              color="success"
              icon="icon-[mdi--check-bold]"
              size="md"
            />
            <div>
              <h4 className="mb--title-bottom font-medium text-success">
                Ano, absolutně!
              </h4>
              <p className="text-fg-secondary text-sm leading-relaxed">
                <strong className="text-fg-primary">
                  Naše řešení je modulární a umožňuje postupný rozvoj.
                </strong>{" "}
                Základ tvoří osvědčené hotové moduly, které můžeme kdykoliv
                doplnit o funkce na míru. Začnete rychle a rozšiřujete podle
                potřeby.
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-surface p-card-padding">
          <div className="flex items-start gap-250">
            <Icon
              className="mt-icon-align flex-shrink-0"
              color="secondary"
              icon="icon-[mdi--rocket-launch-outline]"
              size="md"
            />
            <div>
              <h4 className="mb--title-bottom font-medium text-fg-primary">
                Flexibilní růst
              </h4>
              <p className="text-fg-secondary text-sm leading-relaxed">
                Systém je navržený tak, aby umožňoval implementaci nových
                funkcionalit i v průběhu provozu.{" "}
                <strong className="text-fg-primary">
                  Díky modulárnímu přístupu lze e-shop rozvíjet podle vašich
                  aktuálních potřeb a růstu businessu.
                </strong>{" "}
                Váš úspěch je naším úspěchem.
              </p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "faq-4",
    value: "b2b-features",
    title: (
      <FaqItemHeader
        icon="icon-[mdi--office-building]"
        iconStyle="text-tertiary text-md bg-tertiary/10"
        tag="B2B řešení"
        tagStyle="bg-tertiary/10 text-tertiary"
        title="Jak řešíte B2B specifika jako cenové hladiny a individuální ceníky?"
      />
    ),
    content: (
      <div className="space-y-content-sections pl-faq-primary">
        <div className="rounded-lg border border-tertiary/20 bg-tertiary/5 p-card-padding">
          <div className="flex items-start gap-250">
            <Icon
              className="mt-icon-align flex-shrink-0 text-tertiary"
              icon="icon-[mdi--office-building-outline]"
              size="md"
            />
            <div>
              <h4 className="mb--title-bottom font-medium text-tertiary">
                Komplexní B2B nástroje
              </h4>
              <p className="text-fg-secondary text-sm leading-relaxed">
                Naše řešení obsahuje specializované funkce pro B2B prodej, které
                zefektivní vaše obchodní procesy a zjednoduší správu velkých
                zákazníků.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-card-padding md:grid-cols-2">
          <div className="space-y-250">
            <h5 className="font-medium text-fg-primary">Cenová politika</h5>
            <div className="space-y-200">
              <div className="flex items-start gap-200">
                <Icon
                  className="mt-icon-align flex-shrink-0 text-tertiary"
                  icon="icon-[mdi--currency-usd]"
                  size="sm"
                />
                <span className="text-fg-secondary text-sm">
                  Správa individuálních ceníků a cenových hladin
                </span>
              </div>
              <div className="flex items-start gap-200">
                <Icon
                  className="mt-icon-align flex-shrink-0 text-tertiary"
                  icon="icon-[mdi--swap-horizontal]"
                  size="sm"
                />
                <span className="text-fg-secondary text-sm">
                  Možnost změny aktuálního ceníku pro registrované uživatele
                </span>
              </div>
              <div className="flex items-start gap-200">
                <Icon
                  className="mt-icon-align flex-shrink-0 text-tertiary"
                  icon="icon-[mdi--shield-check]"
                  size="sm"
                />
                <span className="text-fg-secondary text-sm">
                  Automatické kontroly prodejních cen oproti informačnímu
                  systému
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-250">
            <h5 className="font-medium text-fg-primary">Správa účtů</h5>
            <div className="space-y-200">
              <div className="flex items-start gap-200">
                <Icon
                  className="mt-icon-align flex-shrink-0 text-tertiary"
                  icon="icon-[mdi--account-group]"
                  size="sm"
                />
                <span className="text-fg-secondary text-sm">
                  Hlavní zákaznické účty s možností vytvářet podřízené účty
                </span>
              </div>
              <div className="flex items-start gap-200">
                <Icon
                  className="mt-icon-align flex-shrink-0 text-tertiary"
                  icon="icon-[mdi--api]"
                  size="sm"
                />
                <span className="text-fg-secondary text-sm">
                  Kontroly salda s možností napojení na API třetí strany
                </span>
              </div>
              <div className="flex items-start gap-200">
                <Icon
                  className="mt-icon-align flex-shrink-0 text-tertiary"
                  icon="icon-[mdi--lock-outline]"
                  size="sm"
                />
                <span className="text-fg-secondary text-sm">
                  Možnost omezení editace fakturačních údajů pro B2B zákazníky
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface p-card-padding">
          <div className="flex items-start gap-250">
            <Icon
              className="mt-icon-align flex-shrink-0 text-tertiary"
              icon="icon-[mdi--cog-outline]"
              size="md"
            />
            <div>
              <h4 className="mb--title-bottom font-medium text-fg-primary">
                Přizpůsobení workflow
              </h4>
              <p className="text-fg-secondary text-sm leading-relaxed">
                Systém lze přizpůsobit specifickým B2B procesům a požadavkům
                vašeho oboru. Nastavíme automatizace a workflow tak, aby
                odpovídaly vašim obchodním procesům.
              </p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "faq-5",
    value: "integrations",
    title: (
      <FaqItemHeader
        icon="icon-[mdi--link-variant]"
        iconStyle="text-secondary text-md bg-secondary/10"
        tag="Integrace"
        tagStyle="bg-secondary/10 text-secondary"
        title="Jak řešíte napojení na externí systémy a API třetích stran?"
      />
    ),
    content: (
      <div className="space-y-content-sections pl-faq-primary">
        <div className="rounded-lg border border-border bg-surface p-card-padding">
          <p className="mb-300 text-fg-secondary">
            Naše řešení umožňuje integraci s širokou škálou systémů. Standardně
            podporujeme propojení s:
          </p>
          <div className="grid gap-250 md:grid-cols-3">
            <div className="rounded-lg border border-border bg-base p-250">
              <Icon
                className="mb--title-bottom"
                color="secondary"
                icon="icon-[mdi--calculator]"
                size="lg"
              />
              <h5 className="mb--title-bottom font-medium text-fg-primary">
                Účetní systémy
              </h5>
              <p className="text-fg-secondary text-xs">
                Pohoda, Money, Helios a další
              </p>
            </div>
            <div className="rounded-lg border border-border bg-base p-250">
              <Icon
                className="mb--title-bottom"
                color="secondary"
                icon="icon-[mdi--credit-card]"
                size="lg"
              />
              <h5 className="mb--title-bottom font-medium text-fg-primary">
                Platební brány
              </h5>
              <p className="text-fg-secondary text-xs">
                GoPay, GP webpay, PayPal a další
              </p>
            </div>
            <div className="rounded-lg border border-border bg-base p-250">
              <Icon
                className="mb--title-bottom"
                color="secondary"
                icon="icon-[mdi--compare]"
                size="lg"
              />
              <h5 className="mb--title-bottom font-medium text-fg-primary">
                Srovnávače
              </h5>
              <p className="text-fg-secondary text-xs">
                Heureka, Zboží.cz, Google Nákupy
              </p>
            </div>
            <div className="rounded-lg border border-border bg-base p-250">
              <Icon
                className="mb--title-bottom"
                color="secondary"
                icon="icon-[mdi--database-import]"
                size="lg"
              />
              <h5 className="mb--title-bottom font-medium text-fg-primary">
                Dodavatelské systémy
              </h5>
              <p className="text-fg-secondary text-xs">
                XML/CSV feedy pro automatickou synchronizaci
              </p>
            </div>
            <div className="rounded-lg border border-border bg-base p-250">
              <Icon
                className="mb--title-bottom"
                color="secondary"
                icon="icon-[mdi--facebook]"
                size="lg"
              />
              <h5 className="mb--title-bottom font-medium text-fg-primary">
                Sociální sítě
              </h5>
              <p className="text-fg-secondary text-xs">
                Facebook Shop a další pokročilé funkce
              </p>
            </div>
            <div className="rounded-lg border border-border bg-base p-250">
              <Icon
                className="mb--title-bottom"
                color="secondary"
                icon="icon-[mdi--message-text]"
                size="lg"
              />
              <h5 className="mb--title-bottom font-medium text-fg-primary">
                SMS brány
              </h5>
              <p className="text-fg-secondary text-xs">
                Automatizovaná komunikace se zákazníky
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-secondary/20 bg-secondary/5 p-card-padding">
          <div className="flex items-start gap-250">
            <Icon
              className="mt-icon-align flex-shrink-0"
              color="secondary"
              icon="icon-[mdi--cog-outline]"
              size="md"
            />
            <div>
              <h4 className="mb--title-bottom font-medium text-secondary">
                Přizpůsobení na míru
              </h4>
              <p className="text-fg-secondary text-sm leading-relaxed">
                Všechny integrace nastavujeme podle vašich specifických
                požadavků a workflow. Zajistíme, aby systém pracoval přesně tak,
                jak potřebujete.
              </p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "faq-6",
    value: "support",
    title: (
      <FaqItemHeader
        icon="icon-[mdi--support]"
        iconStyle="text-info text-md bg-info/10"
        tag="Podpora"
        tagStyle="bg-info/10 text-info"
        title="Jak funguje technická podpora po spuštění e-shopu?"
      />
    ),
    content: (
      <div className="space-y-content-sections pl-faq-primary">
        <div className="rounded-lg border border-info/20 bg-info/5 p-card-padding">
          <div className="flex items-start gap-250">
            <Icon
              className="mt-icon-align flex-shrink-0 text-info"
              icon="icon-[mdi--shield-check]"
              size="md"
            />
            <div>
              <h4 className="mb--title-bottom font-medium text-info">
                Garantovaná podpora
              </h4>
              <p className="text-fg-secondary text-sm leading-relaxed">
                Nabízíme různé úrovně postimplementační podpory podle potřeb
                vašeho businessu. Každý balíček podpory je smluvně garantován a
                zahrnuje jasně definovaný rozsah služeb s konkrétními reakčními
                dobami.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface p-card-padding">
          <h4 className="mb-250 font-medium text-fg-primary">
            V závislosti na zvolené úrovni podpory můžete využívat:
          </h4>
          <div className="grid gap-card-padding md:grid-cols-2">
            <div className="space-y-250">
              <div className="flex items-start gap-250">
                <Icon
                  className="mt-icon-align flex-shrink-0 text-info"
                  icon="icon-[mdi--headset]"
                  size="md"
                />
                <div>
                  <h5 className="mb-100 font-medium text-fg-primary text-sm">
                    Technickou podporu přes klientské centrum
                  </h5>
                  <p className="text-fg-secondary text-xs">
                    Rychlá odpověď na vaše dotazy s garantovanou reakční dobou
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-250">
                <Icon
                  className="mt-icon-align flex-shrink-0 text-info"
                  icon="icon-[mdi--update]"
                  size="md"
                />
                <div>
                  <h5 className="mb-100 font-medium text-fg-primary text-sm">
                    Pravidelné aktualizace systému
                  </h5>
                  <p className="text-fg-secondary text-xs">
                    Zajišťující bezpečnost a kompatibilitu
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-250">
                <Icon
                  className="mt-icon-align flex-shrink-0 text-info"
                  icon="icon-[mdi--monitor-dashboard]"
                  size="md"
                />
                <div>
                  <h5 className="mb-100 font-medium text-fg-primary text-sm">
                    Monitoring a řešení technických problémů
                  </h5>
                  <p className="text-fg-secondary text-xs">
                    Proaktivní sledování výkonu systému
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-250">
              <div className="flex items-start gap-250">
                <Icon
                  className="mt-icon-align flex-shrink-0 text-info"
                  icon="icon-[mdi--account-tie]"
                  size="md"
                />
                <div>
                  <h5 className="mb-100 font-medium text-fg-primary text-sm">
                    Konzultace s našimi specialisty
                  </h5>
                  <p className="text-fg-secondary text-xs">
                    Odborné poradenství pro optimalizaci businessu
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-250">
                <Icon
                  className="mt-icon-align flex-shrink-0 text-info"
                  icon="icon-[mdi--star]"
                  size="md"
                />
                <div>
                  <h5 className="mb-100 font-medium text-fg-primary text-sm">
                    Přednostní řešení v prémiových balíčcích
                  </h5>
                  <p className="text-fg-secondary text-xs">
                    Prioritní zpracování vašich požadavků
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-success/20 bg-success/5 p-card-padding">
          <div className="flex items-start gap-250">
            <Icon
              className="mt-icon-align flex-shrink-0"
              color="success"
              icon="icon-[mdi--calendar-check]"
              size="md"
            />
            <div>
              <h4 className="mb--title-bottom font-medium text-success">
                Individuální konzultace
              </h4>
              <p className="text-fg-secondary text-sm leading-relaxed">
                Konkrétní rozsah služeb a reakční doby vám představíme během
                úvodní konzultace, kde společně vybereme nejvhodnější úroveň
                podpory pro váš projekt.
              </p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
]

export default function FAQ() {
  return (
    <div className="min-h-screen py-700">
      <div className="mx-auto max-w-layout-max px-400">
        <div className="mb-800 text-center">
          <div className="mb-400 flex items-center justify-center">
            <h1 className="font-bold text-3xl text-fg-primary">
              Často kladené otázky
            </h1>
          </div>
          <p className="mx-auto max-w-layout-lg text-fg-secondary text-lg leading-relaxed">
            Najděte odpovědi na nejčastější otázky ohledně našich e-commerce
            řešení. Pokud nenajdete odpověď na svou otázku, neváhejte nás
            kontaktovat.
          </p>
        </div>
        <div className="rounded-lg">
          <Accordion collapsible multiple shadow="sm">
            {faqData.map((item) => (
              <Accordion.Item key={item.id} value={item.value}>
                <Accordion.Header>
                  <div className="p-200">{item.title}</div>
                  <Accordion.Indicator />
                </Accordion.Header>
                <Accordion.Content>{item.content}</Accordion.Content>
              </Accordion.Item>
            ))}
          </Accordion>
        </div>

        {/* Contact CTA */}
        <div className="mt-800 text-center">
          <div className="rounded-lg bg-surface p-600 shadow-primary">
            <div className="mb-400 flex items-center justify-center">
              <Icon
                className="mr-250 text-2xl text-secondary"
                icon="icon-[ic--outline-message]"
              />
              <h3 className="font-semibold text-fg-primary text-xl">
                Máte další otázky?
              </h3>
            </div>
            <p className="mx-auto mb-500 max-w-layout-md text-fg-secondary">
              Máte dotaz, který zde není zodpovězený? Ozvěte se nám – budeme
              rádi, když vám můžeme poradit a najít společně ideální řešení pro
              vaši situaci.
            </p>
            <div className="flex flex-col justify-center gap-card-padding sm:flex-row">
              <LinkButton
                className="px-250 py-150"
                href="/contact"
                theme="solid"
                variant="primary"
              >
                Kontaktujte nás
              </LinkButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
