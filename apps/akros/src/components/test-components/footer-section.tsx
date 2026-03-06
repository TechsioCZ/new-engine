
import { Icon } from "@ui/atoms/icon"
import { Footer } from "@ui/organisms/footer"
import Image from "next/image"
import Link from "next/link"

const customerLinks = [
  "Doručení k Vám",
  "Osobní vyzvednutí ve Vaší blízkosti",
  "Způsoby platby",
  "Výhody nákupu u nás",
  "Obchodní podmínky",
  "Reklamační řád",
  "GDPR",
  "Návody ke stažení",
  "Náhradní plnění",
]

const paymentIcons = [
  { src: "/icons/card.avif", alt: "Platba kartou", width: 60, height: 43 },
  { src: "/icons/google-pay.avif", alt: "Google Pay", width: 60, height: 43 },
  { src: "/icons/apple-pay.avif", alt: "Apple Pay", width: 60, height: 43 },
  { src: "/icons/cash.avif", alt: "Hotovost", width: 60, height: 43 },
  { src: "/icons/bank.avif", alt: "Bankovní převod", width: 60, height: 43 },
]

const shippingIcons = [
  { src: "/icons/zasilkovna.avif", alt: "Zásilkovna", width: 107, height: 43 },
  { src: "/icons/ppl.avif", alt: "PPL", width: 80, height: 43 },
  { src: "/icons/gls.avif", alt: "GLS", width: 80, height: 43 },
  { src: "/icons/dpd.avif", alt: "DPD", width: 80, height: 43 },
  { src: "/icons/balikovna.avif", alt: "Balíkovna", width: 107, height: 43 },
]

const secureIcons = [
  { src: "/icons/visa.avif", alt: "Verified by Visa", width: 71, height: 41 },
  {
    src: "/icons/master-card.avif",
    alt: "MasterCard SecureCode",
    width: 85,
    height: 41,
  },
]

export function FooterSection() {
  return (
      <Footer
        direction="vertical"
        layout="col"
        sectionFlow="col"
        size="md"
        className="gap-600"
      >
        <Footer.Container className="grid grid-cols-1 xl:grid-cols-[auto_auto_auto_auto]">
          <Footer.Section className="gap-700">
            <Image
              alt="Akros logo"
              className="h-[137px] w-[250px] object-contain object-left"
              height={137}
              src="/logo.avif"
              width={250}
            />

            <div className="flex flex-col gap-300">
              <Footer.Title>Kontakt</Footer.Title>
              <Footer.List>
                <Footer.Text className="inline-flex items-center gap-200 font-medium text-fg-primary">
                  <Icon icon="token-icon-phone" size="xl" />
                  737 591 849
                </Footer.Text>
                <Footer.Text className="inline-flex items-center gap-200 font-medium text-fg-primary">
                  <Icon icon="token-icon-email" size="xl" />
                  akros@akros.cz
                </Footer.Text>
              </Footer.List>
            </div>
          </Footer.Section>

          <Footer.Section>
            <Footer.Title>Informace pro zákazníky</Footer.Title>
            <Footer.List className="text-footer-link-fg">
              {customerLinks.map((linkLabel) => (
                <Link className="underline leading-[2]" href="#" key={linkLabel}>
                  {linkLabel}
                </Link>
              ))}
            </Footer.List>
          </Footer.Section>

          <Footer.Section className="gap-550">
            <Footer.Title>Spolehlivý obchod</Footer.Title>
            <div className="flex h-[89px] w-[89px] items-center justify-center p-[10px]">
              <Image
                alt="Ověřeno zákazníky"
                height={69}
                src="/icons/overeno-zakazniky.avif"
                width={69}
              />
            </div>
          </Footer.Section>

          <Footer.Section className="gap-550">
            <Footer.Title>Sledujte nás</Footer.Title>
            <div className="flex items-center gap-550">
              <Icon icon="icon-[mdi--facebook]" size="2xl" />
              <Icon icon="icon-[mdi--instagram]" size="2xl" />
              <Icon icon="icon-[mdi--youtube]" size="2xl" />
            </div>
          </Footer.Section>
        </Footer.Container>

        <Footer.Container className="flex justify-between border-y p-akros-footer-padding">
          <Footer.Section>
            <Footer.Title>Platební metody</Footer.Title>
            <div className="flex flex-wrap items-center gap-akros-footer-section">
              {paymentIcons.map((icon) => (
                <Image
                  alt={icon.alt}
                  height={icon.height}
                  key={icon.src}
                  src={icon.src}
                  width={icon.width}
                />
              ))}
            </div>
          </Footer.Section>

          <Footer.Section>
            <Footer.Title>Dopravci</Footer.Title>
            <div className="flex flex-wrap items-center gap-akros-footer-section">
              {shippingIcons.map((icon) => (
                <Image
                  alt={icon.alt}
                  height={icon.height}
                  key={icon.src}
                  src={icon.src}
                  width={icon.width}
                />
              ))}
            </div>
          </Footer.Section>

          <Footer.Section>
            <Footer.Title>Bezpečný nákup</Footer.Title>
            <div className="flex flex-wrap items-center gap-akros-footer-section">
              {secureIcons.map((icon) => (
                <Image
                  alt={icon.alt}
                  height={icon.height}
                  key={icon.src}
                  src={icon.src}
                  width={icon.width}
                />
              ))}
            </div>
          </Footer.Section>
        </Footer.Container>

        <Footer.Bottom>
          <Footer.Text className="font-medium">
            Copyright (c) 2014-2025 AKROS b2c / Tvorba eshopu: Web Revolution
          </Footer.Text>
          <div className="flex items-center gap-akros-footer-section">
            <Link href="#">Cookies</Link>
            <Link href="#">Ochrana osobních údajů</Link>
          </div>
        </Footer.Bottom>
      </Footer>
  )
}
