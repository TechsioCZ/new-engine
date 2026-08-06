import { Heading } from "@/components/heading"

const ZpusobyPlatbyPage = () => (
  <article className="space-y-600">
    <Heading>Způsoby platby</Heading>

    <section className="space-y-400">
      <h2 className="font-semibold text-xl">Online platba kartou</h2>
      <p className="text-fg-secondary">
        Objednávku můžete uhradit platební kartou přes zabezpečené rozhraní
        GoPay.
      </p>
    </section>

    <section className="space-y-400">
      <h2 className="font-semibold text-xl">Platba na dobírku</h2>
      <p className="text-fg-secondary">
        Objednávku můžete uhradit platební kartou, či hotově přímo při převzetí
        zásilky.
      </p>
    </section>
  </article>
)

export default ZpusobyPlatbyPage
