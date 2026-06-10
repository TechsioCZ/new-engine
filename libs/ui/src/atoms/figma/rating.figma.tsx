import figma from "@figma/code-connect"
import { Rating } from "../rating"

figma.connect(
  Rating,
  "https://www.figma.com/design/12xb1pqXKwE2vbOByN3ntg/New-Design-System-vol.-2?node-id=521-336",
  {
    imports: ['import { Rating } from "@techsio/ui-kit/atoms/rating"'],
    props: {
      size: figma.enum("size", {
        sm: "sm",
        md: "md",
        lg: "lg",
      }),
      disabled: figma.enum("disabled", {
        true: true,
        false: false,
      }),
      dir: figma.enum("dir", {
        ltr: "ltr",
        rtl: "rtl",
      }),
      allowHalf: figma.boolean("allowHalf"),
      value: figma.string("value"),
      count: figma.string("count"),
      labelText: figma.nestedProps("Label", {
        text: figma.string("text"),
      }),
    },
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
  }
)
