import NextImage from "next/image"

export function HomepagePromoSection() {
  return (
    <section className="grid gap-400 rounded-2xl border border-border-secondary bg-surface p-400 md:grid-cols-2 md:p-550">
      <div className="overflow-hidden rounded-2xl border border-border-secondary">
        <NextImage
          alt="Predajňa Herbatika"
          className="h-full min-h-950 w-full object-cover"
          height={900}
          quality={50}
          src="https://images.unsplash.com/photo-1600093463592-8e36ae95ef56?auto=format&fit=crop&w=1100&q=80"
          width={1100}
        />
      </div>

      <div className="flex flex-col justify-center gap-300">
        <h2 className="font-bold text-2xl text-fg-primary leading-tight">
          Prírodná kozmetika, doplnky výživy a tradičná medicína
        </h2>
        <p className="text-fg-secondary text-sm leading-relaxed">
          Spoznajte blahodarné účinky prírodnej kozmetiky a jej pozitívny vplyv
          nielen na pokožku. Upevnite si vaše zdravie pomocou doplnkov stravy a
          tradičnej medicíny.Toto všetko nájdete v našej pestrej ponuke, ktorá
          je navyše obohatená aj o zdravotné doplnky z prírodných materiálov.
        </p>
        <p className="text-fg-secondary text-sm leading-relaxed">
          Špecializujeme sa na výber tých najkvalitnejších produktov, ktoré aj
          my sami používame, vylepšujeme a opakovane testujeme. Máme radi
          kvalitu a potrpíme si na detaily. Sme pripravení, pomôcť vám s výberom
          produktov špeciálne podľa vašich potrieb alebo na váš zdravotný
          problém.
        </p>
        <p className="text-fg-secondary text-sm leading-relaxed">
          Herbatica má už aj svoju značku, pod ktorou vyrábame množstvo
          produktov, ktoré inde nenájdete. Máme radi kvalitu a detaily a na tie
          sa sústredíme v každom našom produkte.
        </p>
      </div>
    </section>
  )
}
