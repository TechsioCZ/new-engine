import { Icon } from "@techsio/ui-kit/atoms/icon"
import type { IconType } from "@techsio/ui-kit/atoms/icon"

interface FaqItemHeaderProps {
  icon: IconType
  // text-color, text-size for icon, bg-color for circle shape in background
  iconStyle?: string
  title: string
  tag: string
  tagStyle?: string
}
export const FaqItemHeader = ({
  icon,
  iconStyle,
  title,
  tag,
  tagStyle,
}: FaqItemHeaderProps) => {
  return (
    <div className="flex items-center gap-300">
      <div
        className={`flex h-600 w-600 flex-shrink-0 items-center justify-center rounded-full ${iconStyle}`}
      >
        <Icon icon={icon} />
      </div>
      <div className="flex flex-col">
        <h3 className="font-semibold text-fg-primary">{title}</h3>
        <span
          className={`mt-100 inline-block w-fit rounded-full px-200 py-50 font-medium text-xs ${tagStyle}`}
        >
          {tag}
        </span>
      </div>
    </div>
  )
}
