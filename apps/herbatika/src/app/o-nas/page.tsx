import type { Metadata } from "next"
import { AboutPage } from "@/components/about/about-page"

export const metadata: Metadata = {
  title: "O našom tíme | Herbatika",
  description:
    "Spoznajte príbeh značky Herbatica, jej začiatky, tím, nároky na kvalitu, vlastné produkty a víziu do budúcnosti.",
}

export default function AboutPageRoute() {
  return <AboutPage />
}
