"use client"
import { Icon } from "@techsio/ui-kit/atoms/icon"
import { Footer } from "@techsio/ui-kit/organisms/footer"
import Image from "next/image"
import Link from "next/link"
import logo from "@/assets/logo-n1.webp"
import wrLogo from "@/assets/wr.png"

export function N1Footer() {
  return (
    <Footer className="relative px-0 py-0" direction="vertical">
      <Footer.Container className="max-w-full gap-x-800 p-400">
        {/* Company Info Section */}
        <Footer.Section>
          <Image
            alt="N1 Shop Logo"
            className="mb-200 w-auto"
            height={400}
            src={logo}
            width={400}
          />
          <div className="flex flex-col gap-200">
            <div className="flex items-start">
              <Icon
                className="mt-100 mr-200 text-lg text-white"
                icon="icon-[mdi--map-marker]"
                size="sm"
              />
              <div>
                <Footer.Text>N Distribution s. r. o.</Footer.Text>
                <Footer.Text className="text-3xs">
                  Generála Šišky 1990/8, 143 00 Praha 4 - Modřany
                </Footer.Text>
              </div>
            </div>
            <Footer.Text>
              <Icon
                className="mr-200 inline-block text-lg"
                icon="icon-[mdi--phone]"
                size="sm"
              />
              +420 244 402 795
            </Footer.Text>
            <Footer.Link href="mailto:office@ndistribution.cz">
              <Icon
                className="mr-200 inline-block text-lg"
                icon="icon-[mdi--email]"
                size="sm"
              />
              office@ndistribution.cz
            </Footer.Link>
            <Footer.Text>
              <Icon
                className="mr-200 inline-block text-lg"
                icon="icon-[mdi--clock]"
                size="sm"
              />
              Po, Út, St, Čt, Pá: 8:00 - 17:00
            </Footer.Text>
          </div>
        </Footer.Section>

        {/* Business Terms Section */}
        <Footer.Section className="">
          <Footer.Title>Obchodní podmínky</Footer.Title>
          <Footer.List>
            <Footer.Link href="/zasady-ochrany-osobnich-udaju">
              Zásady ochrany osobních údajů
            </Footer.Link>
            <Footer.Link href="/zpusoby-platby">Způsoby platby</Footer.Link>
            <Footer.Link href="/zpusoby-dopravy">Způsoby dopravy</Footer.Link>
            <Footer.Link href="/nastaveni-cookies">
              Nastavení cookies
            </Footer.Link>
          </Footer.List>
        </Footer.Section>

        {/* Cookies Section */}
        <Footer.Section className="">
          <Footer.Title>Opětovné vyvolání cookies</Footer.Title>
        </Footer.Section>

        {/* News Section */}
        <Footer.Section className="">
          <Footer.Title>Novinky</Footer.Title>
        </Footer.Section>
      </Footer.Container>
      <Footer.Bottom className="bg-black">
        <Footer.Text className="text-fg-dark text-xs">
          2025 COPYRIGHT N Distribution s.r.o.
        </Footer.Text>

        <div className="flex items-center gap-100">
          <Footer.Text className="text-fg-dark text-xs">
            Tvorba eshopu:
          </Footer.Text>
          <Link
            className="text-fg-dark text-xs underline hover:no-underline"
            href="https://webrevolution.cz"
          >
            Web Revolution
          </Link>
          <Image
            alt="Web Revolution"
            className="h-auto"
            height={32}
            src={wrLogo}
            width={32}
          />
        </div>
      </Footer.Bottom>
    </Footer>
  )
}
