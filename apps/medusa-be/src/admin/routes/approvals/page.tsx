import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CheckCircle } from "@medusajs/icons"
import { Container, Heading, Toaster } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { translateBreadcrumb } from "../../lib/breadcrumb"
import { ApprovalsTable } from "./components/approvals-table"

export const handle = {
  breadcrumb: () => translateBreadcrumb("approvals:menuItem", "Approvals"),
}

const Approvals = () => {
  const { t } = useTranslation("approvals")

  return (
    <>
      <Container className="flex flex-col overflow-hidden p-0">
        <Heading className="h1-core p-6 pb-0 font-medium font-sans">
          {t("menuItem")}
        </Heading>
        <ApprovalsTable />
      </Container>
      <Toaster />
    </>
  )
}

export const config = defineRouteConfig({
  label: "menuItem",
  icon: CheckCircle,
  translationNs: "approvals",
})

export default Approvals
