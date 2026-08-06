import type { Metadata } from "next"

import { AboutPage } from "@/components/about/about-page"

export const metadata: Metadata = {
  description:
    "Spoznajte príbeh značky Herbatica, jej začiatky, tím, nároky na kvalitu, vlastné produkty a víziu do budúcnosti.",
  title: "O našom tíme | Herbatika",
}

const AboutPageRoute = () => <AboutPage />

export default AboutPageRoute
