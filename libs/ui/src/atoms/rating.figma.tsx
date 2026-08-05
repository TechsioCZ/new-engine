import figma from "@figma/code-connect"

import { Rating } from "./rating"

figma.connect(
  Rating,
  "https://www.figma.com/design/12xb1pqXKwE2vbOByN3ntg/New-Design-System-vol.-2?node-id=521-336",
  {
    example: ({ size, disabled, dir, allowHalf, value, count, labelText }) => (
      <Rating
        allowHalf={allowHalf}
        count={Number(count)}
        defaultValue={Number(value)}
        dir={dir}
        disabled={disabled}
        labelText={labelText.text}
        size={size}
      />
    ),
    imports: ['import { Rating } from "@techsio/ui-kit/atoms/rating"'],
    props: {
      allowHalf: figma.boolean("allowHalf"),
      count: figma.string("count"),
      dir: figma.enum("dir", {
        ltr: "ltr",
        rtl: "rtl",
      }),
      disabled: figma.enum("disabled", {
        true: true,
        false: false,
      }),
      labelText: figma.nestedProps("Label", {
        text: figma.string("text"),
      }),
      size: figma.enum("size", {
        sm: "sm",
        md: "md",
        lg: "lg",
      }),
      value: figma.string("value"),
    },
  }
)
