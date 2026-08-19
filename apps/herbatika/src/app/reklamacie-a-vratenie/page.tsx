import type { Metadata } from "next"
import { connection } from "next/server"
import { Suspense } from "react"
import { ClaimsPage } from "@/components/claims/claims-page"

export const metadata: Metadata = {
  title: "Reklamácie a vrátenie tovaru | Herbatika",
  description:
    "Online formulár na vrátenie alebo reklamáciu tovaru z objednávky Herbatika.",
}

async function DynamicMetadataMarker() {
  await connection()
  return null
}

export default function ClaimsPageRoute() {
  return (
    <>
      <ClaimsPage />
      <Suspense>
        <DynamicMetadataMarker />
      </Suspense>
    </>
  )
}
