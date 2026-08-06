import type { Metadata } from "next"

import { FaqPage } from "@/components/faq/faq-page"

export const metadata: Metadata = {
  description:
    "Odpovede na často kladené otázky o objednávkach, dostupnosti tovaru, zľavových kupónoch, spolupráci, predajni, vrátení a reklamáciách.",
  title: "Často kladené otázky | Herbatika",
}

const FaqPageRoute = () => <FaqPage />

export default FaqPageRoute
