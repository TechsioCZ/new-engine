import { CmsPageArticle } from "@/components/cms-page-article"
import { Heading } from "@/components/heading"
import { getCmsPage } from "@/services/cms-service"

export default async function ZasadyOchranyPage() {
  const cmsPage = await getCmsPage("zasady-ochrany-osobnich-udaju")

  if (cmsPage) {
    return <CmsPageArticle page={cmsPage} />
  }

  return (
    <article className="mt-900 space-y-600">
      <Heading>Zásady ochrany osobních údajů</Heading>

      <section className="space-y-400">
        <p className="text-fg-secondary">
          Kupující souhlasí se zpracováním těchto svých osobních údajů: jméno a
          příjmení, adresa bydliště, identifikační číslo, daňové identifikační
          číslo, adresa elektronické pošty, telefonní číslo.
        </p>
      </section>

      <section className="space-y-400">
        <h2 className="font-semibold text-xl">Účel zpracování</h2>
        <p className="text-fg-secondary">
          Osobní údaje jsou zpracovávány za účelem realizace práv a povinností z
          kupní smlouvy a za účelem vedení uživatelského účtu. Kupující souhlasí
          se zasíláním informací souvisejících se zbožím, službami nebo podnikem
          prodávajícího.
        </p>
      </section>

      <section className="space-y-400">
        <h2 className="font-semibold text-xl">Zpracování údajů</h2>
        <p className="text-fg-secondary">
          Zpracováním osobních údajů kupujícího může prodávající pověřit třetí
          osobu, jakožto zpracovatele. Osobní údaje nebudou předány třetím
          osobám mimo osoby dopravující zboží.
        </p>
        <p className="text-fg-secondary">
          Osobní údaje budou zpracovávány po dobu neurčitou. Osobní údaje budou
          zpracovávány v elektronické podobě automatizovaným způsobem nebo v
          tištěné podobě neautomatizovaným způsobem.
        </p>
      </section>

      <section className="space-y-400">
        <h2 className="font-semibold text-xl">Práva kupujícího</h2>
        <p className="text-fg-secondary">
          Kupující potvrzuje, že poskytnuté osobní údaje jsou přesné a že byl
          poučen o tom, že se jedná o dobrovolné poskytnutí osobních údajů.
        </p>
        <p className="text-fg-secondary">
          V případě, že by se kupující domníval, že prodávající nebo zpracovatel
          provádí zpracování jeho osobních údajů, které je v rozporu s ochranou
          soukromého a osobního života kupujícího nebo v rozporu se zákonem,
          může požádat prodávajícího o vysvětlení nebo požadovat odstranění
          závadného stavu.
        </p>
      </section>

      <section className="space-y-400">
        <h2 className="font-semibold text-xl">Cookies</h2>
        <p className="text-fg-secondary">
          Náš web používá soubory cookies pro zajištění správné funkčnosti webu.
          Rozlišujeme několik kategorií cookies:
        </p>
        <ul className="ml-400 list-inside list-disc space-y-200 text-fg-secondary">
          <li>Nezbytné cookies - nutné pro fungování webu</li>
          <li>Statistické cookies - pomáhají vylepšovat web</li>
          <li>Marketingové cookies - přizpůsobení reklamy</li>
        </ul>
      </section>

      <section className="space-y-400">
        <h2 className="font-semibold text-xl">Kontakt</h2>
        <p className="text-fg-secondary">
          Správce osobních údajů: N Distribution s.r.o., IČO: 03564274
        </p>
        <p className="text-fg-secondary">Email: office@ndistribution.cz</p>
      </section>
    </article>
  )
}
