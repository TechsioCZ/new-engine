import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CheckCircle } from "@medusajs/icons"
import { Container, Heading, Toaster } from "@medusajs/ui"
import { ApprovalsTable } from "./components/approvals-table"

const Approvals = () => (
  <>
    <Container className="flex flex-col overflow-hidden p-0">
      <Heading className="h1-core p-6 pb-0 font-medium font-sans">
        Approvals
      </Heading>
      <ApprovalsTable />
    </Container>
    <Toaster />
  </>
)

export const config = defineRouteConfig({
  label: "Approvals",
  icon: CheckCircle,
})

export default Approvals
