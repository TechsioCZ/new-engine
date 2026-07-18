import { Button } from "@techsio/ui-kit/atoms/button"

import { Heading } from "@/components/heading"

export default function KontaktyPage() {
  return (
    <article className="space-y-600">
      <Heading>Kontakty</Heading>

      <div className="grid place-items-center text-center">
        <section className="space-y-600">
          <span>
            <span>email: </span>
            <a className="underline" href="mailto:eshop@ndistribution.cz">
              eshop@ndistribution.cz
            </a>
          </span>
          <h3 className="mt-800">Adresa pro výměnu zboží a reklamace</h3>
          <address className="space-y-400 text-fg-secondary not-italic">
            <div className="space-y-200">
              <p className="font-bold text-fg-primary text-lg">
                N Distribution s. r. o.
              </p>
              <p>Administrativní centrum Ticie</p>
              <p>Československého exilu 2062/8</p>
              <p>143 00 Praha 4 - Modřany</p>
              <p>Česká republika</p>
            </div>

            <div className="space-y-200">
              <p>
                <span className="font-medium">Telefon: </span>
                <a className="hover:underline" href="tel:+420244402795">
                  +420 244 402 795
                </a>
              </p>
            </div>

            <div className="space-y-200">
              <p>
                <span className="font-medium">E-shop: </span>
                <a
                  className="hover:underline"
                  href="mailto:eshop@ndistribution.cz"
                >
                  eshop@ndistribution.cz
                </a>
              </p>
              <p>
                <span className="font-medium">Reklamace: </span>
                <a
                  className="hover:underline"
                  href="mailto:reklamace@ndistribution.cz"
                >
                  reklamace@ndistribution.cz
                </a>
              </p>
              <p>
                <span className="font-medium">Kancelář: </span>
                <a
                  className="hover:underline"
                  href="mailto:office@ndistribution.cz"
                >
                  office@ndistribution.cz
                </a>
              </p>
            </div>

            <div className="space-y-200 pt-400">
              <p className="font-medium">Provozovna:</p>
              <p>Generála Šišky 1990/8</p>
              <p>143 00 Praha 4 - Modřany</p>
            </div>
          </address>
        </section>
      </div>

      <section className="space-y-600">
        <h2 className="font-semibold text-xl">Kontaktní formulář</h2>

        <form className="grid grid-cols-2 gap-400">
          <div className="space-y-200">
            <label className="block font-medium text-2xs" htmlFor="name">
              Jméno a příjmení
            </label>
            <input
              className="w-full rounded-lg border px-400 py-300 focus:border-primary focus:outline-none"
              id="name"
              name="name"
              required
              type="text"
            />

            <label className="block font-medium text-2xs" htmlFor="phone">
              Telefon
            </label>
            <input
              className="w-full rounded-lg border px-400 py-300 focus:border-primary focus:outline-none"
              id="phone"
              name="phone"
              type="tel"
            />

            <label className="block font-medium text-2xs" htmlFor="email">
              E-mail
            </label>
            <input
              className="w-full rounded-lg border px-400 py-300 focus:border-primary focus:outline-none"
              id="email"
              name="email"
              required
              type="email"
            />
          </div>

          <div className="space-y-200">
            <label className="block font-medium text-2xs" htmlFor="message">
              Zpráva
            </label>
            <textarea
              className="w-full resize-none rounded-lg border px-400 py-300 focus:border-primary focus:outline-none"
              id="message"
              name="message"
              required
              rows={5}
            />
            <Button className="w-full" type="submit">
              Odeslat
            </Button>
          </div>
        </form>
      </section>
    </article>
  )
}
