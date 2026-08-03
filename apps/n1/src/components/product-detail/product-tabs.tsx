import { Tabs } from "@techsio/ui-kit/molecules/tabs"

type TabConfig = {
  value: string
  label: string
  headline?: string
  content: React.ReactNode
}

type ProductTabsProps = {
  description?: string | null | undefined
  tabs?: TabConfig[]
}

export const ProductTabs = ({ description, tabs }: ProductTabsProps) => (
  <div>
    <Tabs className="px-0" defaultValue={tabs?.[0]?.value} variant="line">
      <Tabs.List>
        {tabs?.map((item) => (
          <Tabs.Trigger
            className="uppercase"
            key={item.value}
            value={item.value}
          >
            {item.label}
          </Tabs.Trigger>
        ))}
        <Tabs.Indicator />
      </Tabs.List>
      <p className="py-250">{description}</p>
      {tabs?.map((tab) => (
        <Tabs.Content className="px-0" key={tab.value} value={tab.value}>
          {tab.headline && (
            <h3 className="mb-200 font-bold text-lg uppercase">
              {tab.headline}
            </h3>
          )}
          {tab.content}
        </Tabs.Content>
      ))}
    </Tabs>
  </div>
)
