/**
 * Rating — @techsio/ui-kit atom.
 *
 * @component Rating
 * @componentVersion v1.0.0
 * @skill rating-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the rating-usage skill's component_version and a changelog entry. Bump all three together.
 */
import * as ratingGroup from "@zag-js/rating-group"
import { mergeProps, normalizeProps, useMachine } from "@zag-js/react"
import { useId } from "react"
import type { HTMLAttributes } from "react"
import type { VariantProps } from "tailwind-variants"

import { tv } from "../utils"
import { Label } from "./label"

const rating = tv({
  defaultVariants: {
    size: "md",
  },
  slots: {
    control: ["flex"],
    item: [
      "cursor-pointer transition-colors duration-200",
      "cursor-pointer transition-colors duration-200 motion-reduce:transition-none",
      "text-rating-fg-base",
      "data-highlighted:text-rating-fg-active",
      "data-disabled:cursor-not-allowed",
      "data-disabled:data-highlighted:text-rating-fg-disabled",
      "token-icon-rating",
      "data-half:token-icon-rating-half",
    ],
    itemWrapper: [
      "flex items-center",
      "has-focus-visible:outline-(style:--default-ring-style) has-focus-visible:outline-(length:--default-ring-width)",
      "has-focus-visible:outline-rating-ring",
      "has-focus-visible:outline-offset-(length:--default-ring-offset)",
    ],
    root: ["grid items-center"],
  },
  variants: {
    isInteractive: {
      false: {
        item: "cursor-default",
      },
      true: {},
    },
    size: {
      lg: {
        control: "gap-rating-lg",
        item: "text-rating-lg",
        root: "gap-rating-lg",
      },
      md: {
        control: "gap-rating-md",
        item: "text-rating-md",
        root: "gap-rating-md",
      },
      sm: {
        control: "gap-rating-sm",
        item: "text-rating-sm",
        root: "gap-rating-sm",
      },
    },
  },
})

type RatingVariants = Omit<VariantProps<typeof rating>, "isInteractive">

export interface RatingProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "onChange">, RatingVariants {
  value?: number | undefined
  defaultValue?: number | undefined
  count?: number | undefined
  labelText?: string | undefined
  readOnly?: boolean | undefined
  disabled?: boolean | undefined
  allowHalf?: boolean | undefined
  name?: string | undefined
  dir?: "ltr" | "rtl" | undefined
  translations?: ratingGroup.IntlTranslations | undefined
  onChange?: ((value: number) => void) | undefined
  onHoverChange?: ((value: number) => void) | undefined
}

export function Rating({
  value,
  defaultValue,
  count = 5,
  labelText,
  readOnly = false,
  disabled = false,
  allowHalf = true,
  name,
  dir = "ltr",
  translations,
  onChange,
  onHoverChange,
  size = "md",
  className,
  ...props
}: RatingProps) {
  const generatedId = useId()
  const uniqueId = props.id || generatedId

  const service = useMachine(ratingGroup.machine, {
    id: uniqueId,
    count,
    disabled,
    readOnly,
    allowHalf,
    dir,
    ...(value !== undefined && { value }),
    ...(defaultValue !== undefined && { defaultValue }),
    ...(name !== undefined && { name }),
    ...(translations !== undefined && { translations }),
    onValueChange: ({ value: newValue }) => {
      onChange?.(newValue)
    },
    onHoverChange: ({ hoveredValue }) => {
      onHoverChange?.(hoveredValue)
    },
  })

  const api = ratingGroup.connect(service, normalizeProps)

  const { root, control, itemWrapper, item } = rating({
    isInteractive: !(readOnly || disabled),
    size,
  })

  return (
    <div
      {...mergeProps(api.getRootProps(), props)}
      className={root({ className })}
    >
      {labelText && <Label {...api.getLabelProps()}>{labelText}</Label>}
      <input {...api.getHiddenInputProps()} />
      <div className={control()} {...api.getControlProps()}>
        {api.items.map((index) => (
          <div className={itemWrapper()} key={`star-${index}`}>
            <span className={item()} {...api.getItemProps({ index })} />
          </div>
        ))}
      </div>
    </div>
  )
}
