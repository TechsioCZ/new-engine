import { defineRouteConfig } from "@medusajs/admin-sdk"
import { DocumentText } from "@medusajs/icons"
import { Container, Heading, Toaster } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { QuotesTable } from "./components/quotes-table"

const Quotes = () => {
  const { t } = useTranslation("quotes")

  return (
    <>
      <Container className="flex flex-col overflow-hidden p-0">
        <Heading className="h1-core p-6 pb-0 font-medium font-sans">
          {t("menuItem")}
        </Heading>

        <QuotesTable />
      </Container>
      <Toaster />
    </>
  )
}

export const config = defineRouteConfig({
  label: "menuItem",
  icon: DocumentText,
  translationNs: "quotes",
})

export default Quotes
