import { Heading } from "@/components/heading"

const ZpusobyDopravyPage = () => (
  <article className="space-y-600">
    <Heading>Způsoby dopravy</Heading>

    <section className="space-y-400">
      <h2 className="font-semibold text-xl">PPL Balík</h2>
      <p className="font-bold text-lg text-primary">120 Kč</p>
      <p className="text-fg-secondary">
        Nejpohodlnější možnost, kdy Vám kurýr PPL doručí balíček až ke dveřím
        Vašeho domu.
      </p>
    </section>

    <section className="space-y-400">
      <h2 className="font-semibold text-xl">PPL Parcel Shop</h2>
      <p className="text-fg-secondary">
        Nechcete být svazováni časovým intervalem, během kterého Vám kurýr bude
        doručovat zásilku? Pak vyberte možnost PPL Parcel Shop a vyzvedněte si
        svou zásilku na jednom z více než 5500 výdejních míst po celé České
        republice.
      </p>
    </section>
  </article>
)

export default ZpusobyDopravyPage
