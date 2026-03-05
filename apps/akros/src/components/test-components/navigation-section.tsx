import { Breadcrumb } from "@ui/molecules/breadcrumb"
import { Tabs } from "@ui/molecules/tabs"
import { breadcrumbItems } from "./data"
import { TestComponentsSection } from "./section"

export function NavigationSection() {
  return (
    <TestComponentsSection
      title="Breadcrumb + Tabs"
      description="My Account/PDP navigace: `Breadcrumb` + `Tabs variant=line` ve velikostech `sm` a `md`."
    >
      <div className="flex flex-col gap-300">
        <Breadcrumb items={breadcrumbItems} size="md" />

        <Tabs defaultValue="osobni" size="sm" variant="line">
          <Tabs.List>
            <Tabs.Trigger value="osobni">Osobní údaje</Tabs.Trigger>
            <Tabs.Trigger value="fakturacni">Fakturační údaje</Tabs.Trigger>
            <Tabs.Trigger value="doruceni">Doručovací adresy</Tabs.Trigger>
            <Tabs.Indicator />
          </Tabs.List>
          <Tabs.Content value="osobni">Obsah záložky `sm`.</Tabs.Content>
          <Tabs.Content value="fakturacni">Obsah záložky `sm`.</Tabs.Content>
          <Tabs.Content value="doruceni">Obsah záložky `sm`.</Tabs.Content>
        </Tabs>

        <Tabs defaultValue="osobni" size="md" variant="line">
          <Tabs.List>
            <Tabs.Trigger value="osobni">Osobní údaje</Tabs.Trigger>
            <Tabs.Trigger value="fakturacni">Fakturační údaje</Tabs.Trigger>
            <Tabs.Trigger value="doruceni">Doručovací adresy</Tabs.Trigger>
            <Tabs.Indicator />
          </Tabs.List>
          <Tabs.Content value="osobni">Obsah záložky `md`.</Tabs.Content>
          <Tabs.Content value="fakturacni">Obsah záložky `md`.</Tabs.Content>
          <Tabs.Content value="doruceni">Obsah záložky `md`.</Tabs.Content>
        </Tabs>
      </div>
    </TestComponentsSection>
  )
}
