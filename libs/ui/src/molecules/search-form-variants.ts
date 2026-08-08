import { tv } from "../utils"

export const searchFormVariants = tv({
  defaultVariants: {
    gapped: false,
    size: "md",
  },
  slots: {
    // The button keeps its own styling/focus ring from the Button atom.
    // `focus-visible:z-10` mirrors the input so a focused button outline wins.
    button: ["relative shrink-0", "focus-visible:z-10"],
    // The clear button (an ActionIcon) lives inside the input, pinned to the
    // trailing edge at the input's inline padding (set per size below) and
    // vertically centered. ActionIcon owns its size, glyph and hover pill.
    clearButton: ["absolute top-1/2 -translate-y-1/2"],
    control: ["flex items-stretch"],
    // The input keeps its own styling/focus ring from the Input atom.
    input: ["w-full"],
    // Positioning context for the absolutely-placed clear button, and the
    // flex item that holds the input. `focus-within:z-10` lifts the focused
    // input (and its outline) above the adjacent button so the focus ring is
    // never painted underneath it.
    inputWrapper: ["relative min-w-0 flex-1", "focus-within:z-10"],
    // Layout-only wrapper. The input and button are composed side by side and
    // each keep their own border, background, radius, and focus ring so they
    // focus independently instead of sharing one ring around the whole group.
    root: ["relative grid"],
  },
  variants: {
    gapped: {
      // Joined: strip the touching corners so the two controls read as one.
      false: {
        button: "rounded-s-none",
        input: "rounded-e-none",
      },
      // Detached: 8px gap and the controls keep their full rounded corners.
      true: { control: "gap-search-form-gapped" },
    },
    size: {
      // Pin the button to the shared form-control height so it always matches
      // the input height — including `lg`, which the Button atom sizes by
      // padding alone. The clear button trails the input by its inline padding.
      lg: {
        button: "h-form-control-lg",
        clearButton: "end-(length:--padding-input-lg)",
        root: "gap-search-form-lg",
      },
      md: {
        button: "h-form-control-md",
        clearButton: "end-(length:--padding-input-md)",
        root: "gap-search-form-md",
      },
      sm: {
        button: "h-form-control-sm",
        clearButton: "end-(length:--padding-input-sm)",
        root: "gap-search-form-sm",
      },
    },
  },
})
