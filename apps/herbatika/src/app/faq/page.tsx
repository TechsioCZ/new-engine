import type { Metadata } from "next"
import { FaqPage } from "@/components/faq/faq-page"

export const metadata: Metadata = {
  title: "Často kladené otázky | Herbatika",
  description:
    "Odpovede na často kladené otázky o objednávkach, dostupnosti tovaru, zľavových kupónoch, spolupráci, predajni, vrátení a reklamáciách.",
}

export default function FaqPageRoute() {
  return <FaqPage />
}
