import { CmsPageArticle } from "@/components/cms-page-article"
import { Heading } from "@/components/heading"
import { getCmsPage } from "@/services/cms-service"

export default async function ObchodniPodminkyPage() {
  const cmsPage = await getCmsPage("obchodni-podminky")

  if (cmsPage) {
    return <CmsPageArticle page={cmsPage} />
  }

  return (
    <article className="space-y-600">
      <Heading>Obchodní podmínky</Heading>

      <h2 className="font-semibold text-xl">
        Všeobecné obchodní podmínky pro spotřebitele
      </h2>

      <section className="space-y-400">
        <p className="text-fg-secondary">
          Tyto obchodní podmínky platí pro nákup v internetovém obchodě
          www.n1shop.cz provozovaném společností N Distribution s.r.o.
        </p>

        <div className="space-y-200 text-fg-secondary">
          <p>IČO: 03564274</p>
          <p>DIČ: CZ03564274</p>
          <p>Sídlo: Generála Šišky 1990/8, 143 00 Praha 4 - Modřany</p>
          <p>
            Zapsaná v obchodním rejstříku vedeném Městským soudem v Praze, oddíl
            C, vložka 233602
          </p>
        </div>

        <div className="space-y-200 text-fg-secondary">
          <p>Telefon: +420 244 402 795</p>
          <p>Email: office@ndistribution.cz</p>
        </div>
      </section>

      <section className="space-y-400">
        <h3 className="font-medium text-lg">Reklamace vadného zboží</h3>
        <p className="text-fg-secondary">
          Reklamaci lze uplatnit v zákonné lhůtě 24 měsíců od převzetí zboží.
          Reklamované zboží zašlete na naši adresu společně s popisem závady a
          dokladem o koupi.
        </p>
        <p className="text-fg-secondary">
          Email pro reklamace: reklamace@n1shop.cz
        </p>
      </section>

      <section className="space-y-400">
        <h3 className="font-medium text-lg">Vrácení zboží</h3>
        <p className="text-fg-secondary">
          Máte právo odstoupit od smlouvy do 14 dnů od převzetí zboží bez udání
          důvodu.
        </p>
      </section>

      <section className="space-y-400">
        <h3 className="font-medium text-lg">Výměna zboží</h3>
        <p className="text-fg-secondary">
          Výměnu zboží za jinou velikost či barvu lze provést do 14 dnů od
          převzetí. Zboží musí být nepoškozené, nepoužité, s originálními
          visačkami.
        </p>
      </section>

      <section className="space-y-400">
        <h3 className="font-medium text-lg">Proč nakupovat u nás</h3>
        <ul className="list-inside list-disc space-y-200 text-fg-secondary">
          <li>Rychlé doručení</li>
          <li>Kvalitní zákaznický servis</li>
          <li>Bezpečná platba</li>
          <li>Široký výběr zboží</li>
        </ul>
      </section>
    </article>
  )
}
