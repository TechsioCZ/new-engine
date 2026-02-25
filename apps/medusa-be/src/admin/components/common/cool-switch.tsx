import { InformationCircleSolid } from "@medusajs/icons"
import { Container, Label, Switch, Text, Tooltip } from "@medusajs/ui"

const CoolSwitch = ({
  checked,
  onChange,
  fieldName,
  label,
  description,
  tooltip,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  fieldName: string
  label: string
  description: string
  tooltip?: string
}) => (
  <Container className="flex flex-col gap-2 bg-ui-bg-subtle">
    <div className="flex items-center gap-2">
      <Switch checked={checked} name={fieldName} onCheckedChange={onChange} />
      <Label className="txt-compact-small font-medium" size="xsmall">
        {label}
      </Label>
      {tooltip && (
        <Tooltip className="z-50" content={tooltip}>
          <InformationCircleSolid color="gray" />
        </Tooltip>
      )}
    </div>
    <Text size="xsmall">{description}</Text>
  </Container>
)

export { CoolSwitch }
