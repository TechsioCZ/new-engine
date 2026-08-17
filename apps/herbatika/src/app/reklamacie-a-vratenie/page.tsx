import type { Metadata } from "next"
import { ClaimsPage } from "@/components/claims/claims-page"

export const metadata: Metadata = {
  title: "Reklamácie a vrátenie tovaru | Herbatika",
  description:
    "Online formulár na vrátenie alebo reklamáciu tovaru z objednávky Herbatika.",
}

export default function ClaimsPageRoute() {
  return <ClaimsPage />
}
