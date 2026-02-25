import { defineRouteConfig } from "@medusajs/admin-sdk"
import { DocumentText } from "@medusajs/icons"
import { Container, Heading, Toaster } from "@medusajs/ui"
import { QuotesTable } from "./components/quotes-table"

const Quotes = () => (
  <>
    <Container className="flex flex-col overflow-hidden p-0">
      <Heading className="h1-core p-6 pb-0 font-medium font-sans">
        Quotes
      </Heading>

      <QuotesTable />
    </Container>
    <Toaster />
  </>
)

export const config = defineRouteConfig({
  label: "Quotes",
  icon: DocumentText,
})

export default Quotes
