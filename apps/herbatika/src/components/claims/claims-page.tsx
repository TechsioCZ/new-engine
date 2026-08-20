import { HerbatikaBreadcrumb } from "@/components/herbatika-breadcrumb"
import { ClaimForm } from "./claim-form"

export function ClaimsPage() {
  return (
    <main className="w-full bg-base font-rubik">
      <div className="mx-auto flex w-full max-w-max-w flex-col gap-500 p-300 md:p-500 2xl:p-600">
        <HerbatikaBreadcrumb
          items={[
            { label: "Domov", href: "/", icon: "token-icon-home" },
            { label: "Reklamácie a vrátenie" },
          ]}
        />
        <section className="mx-auto grid w-full max-w-max-w gap-600 lg:grid-cols-2">
          <div className="flex flex-col gap-500">
            <div className="flex flex-col gap-200">
              <h1 className="font-bold text-4xl text-fg-primary leading-tight">
                Reklamácie a vrátenie tovaru
              </h1>
              <p className="font-verdana text-fg-secondary leading-relaxed">
                Vyhľadajte objednávku, overte svoj e-mail a vyberte produkty,
                ktoré chcete vrátiť alebo reklamovať.
              </p>
            </div>
            <ClaimForm />
          </div>
          <aside className="flex h-fit flex-col gap-300 rounded-lg border border-border-base bg-surface p-400">
            <h2 className="font-bold text-fg-primary text-xl">
              Ako to funguje
            </h2>
            <ol className="list-decimal space-y-200 pl-400 text-fg-secondary">
              <li>Zvoľte vrátenie alebo reklamáciu.</li>
              <li>Overte objednávku kódom z e-mailu.</li>
              <li>Vyberte konkrétne produkty a množstvo.</li>
              <li>Po odoslaní dostanete číslo prípadu a pokyny.</li>
            </ol>
            <p className="text-fg-secondary text-sm">
              Pri vrátení tovaru nemusíte uvádzať dôvod. Ak objednávku neviete
              dohľadať, použite ručný formulár.
            </p>
          </aside>
        </section>
      </div>
    </main>
  )
}
