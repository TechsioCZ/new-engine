describe("Form utilities", () => {
  const loadForm = (fieldState: any = { error: undefined }) => {
    let useContextCall = 0

    jest.resetModules()

    jest.doMock("react", () => {
      const actual = jest.requireActual("react")
      return {
        ...actual,
        useContext: () => {
          useContextCall += 1
          return useContextCall % 2 === 1 ? { name: "email" } : { id: "item_1" }
        },
        useId: () => "item_1",
      }
    })

    jest.doMock("@medusajs/ui", () => {
      const React = jest.requireActual("react")
      const clx = (...parts: any[]) =>
        parts
          .flatMap((part) => {
            if (!part) {
              return []
            }

            if (typeof part === "string") {
              return [part]
            }

            if (typeof part === "object") {
              return Object.keys(part).filter((key) => part[key])
            }

            return []
          })
          .join(" ")

      const Hint = ({ children, ...props }: any) =>
        React.createElement("hint", props, children)
      const Label = ({ children, ...props }: any) =>
        React.createElement("label-component", props, children)
      const Text = ({ children, ...props }: any) =>
        React.createElement("text", props, children)
      const Tooltip = ({ children, ...props }: any) =>
        React.createElement("tooltip", props, children)

      return { clx, Hint, Label, Text, Tooltip }
    })

    jest.doMock("@medusajs/icons", () => ({
      InformationCircleSolid: (props: any) =>
        require("react").createElement("info-icon", props),
    }))

    jest.doMock("@radix-ui/react-slot", () => ({
      Slot: ({ children, ...props }: any) =>
        require("react").createElement("slot", props, children),
    }))

    jest.doMock("react-hook-form", () => {
      const React = jest.requireActual("react")
      return {
        Controller: (props: any) => React.createElement("controller", props),
        FormProvider: ({ children, ...props }: any) =>
          React.createElement("form-provider", props, children),
        useFormContext: () => ({
          getFieldState: () => fieldState,
        }),
        useFormState: () => ({}),
      }
    })

    return require("../form").Form
  }

  it("renders Form.Field through Controller and sets context name", () => {
    const Form = loadForm()

    const field = Form.Field({
      name: "email",
      control: {} as any,
      render: () => null,
    })

    const controller = field.props.children
    const { Controller } = require("react-hook-form")
    expect(controller.type).toBe(Controller)
    expect(controller.props.name).toBe("email")
  })

  it("renders label/control metadata and optional decorations", () => {
    const Form = loadForm({ error: { message: "Required" } })

    const label = Form.Label.render(
      {
        optional: true,
        tooltip: "Tooltip",
        children: "Email",
      },
      null
    )

    const labelComponent = label.props.children[0]
    const { Label, Text } = require("@medusajs/ui")
    expect(labelComponent.type).toBe(Label)
    expect(labelComponent.props.id).toBe("item_1-form-item-label")
    expect(labelComponent.props.htmlFor).toBe("item_1-form-item")

    const optionalText = label.props.children[3]
    expect(optionalText.type).toBe(Text)
    expect(optionalText.props.children).toBe("Optional")

    const control = Form.Control.render({ children: "input" }, null)
    expect(control.props.id).toBe("item_1-form-item")
    expect(control.props["aria-invalid"]).toBe(true)
    expect(control.props["aria-labelledby"]).toBe("item_1-form-item-label")
    expect(control.props["aria-describedby"]).toBe(
      "item_1-form-item-description item_1-form-item-message"
    )
  })

  it("renders error messages and returns null for empty messages", () => {
    const FormWithError = loadForm({ error: { message: "Invalid value" } })
    const withError = FormWithError.ErrorMessage.render({}, null)
    const { Hint } = require("@medusajs/ui")
    expect(withError.type).toBe(Hint)
    expect(withError.props.id).toBe("item_1-form-item-message")
    expect(withError.props.variant).toBe("error")
    expect(withError.props.children).toBe("Invalid value")

    const FormWithoutError = loadForm({ error: undefined })
    const empty = FormWithoutError.ErrorMessage.render({}, null)
    expect(empty).toBeNull()

    const withChildren = FormWithoutError.ErrorMessage.render(
      { children: "Helper message" },
      null
    )
    expect(withChildren.type.name).toBe("Hint")
    expect(withChildren.props.variant).toBe("info")
    expect(withChildren.props.children).toBe("Helper message")
  })

  it("renders item/hint wrappers and control without error state", () => {
    const Form = loadForm({ error: undefined })

    const item = Form.Item.render({ className: "gap-2", children: "child" }, null)
    expect(item.props.value.id).toBe("item_1")
    expect(item.props.children.type).toBe("div")

    const hint = Form.Hint.render({ children: "Helpful text" }, null)
    const { Hint } = require("@medusajs/ui")
    expect(hint.type).toBe(Hint)
    expect(hint.props.id).toBe("item_1-form-item-description")

    const label = Form.Label.render({ children: "Email" }, null)
    expect(label.props.children[3]).toBeFalsy()

    const control = Form.Control.render({ children: "input" }, null)
    expect(control.props["aria-invalid"]).toBe(false)
    expect(control.props["aria-describedby"]).toBe("item_1-form-item-description")
  })

  it("throws when form field context is missing", () => {
    jest.resetModules()

    jest.doMock("react", () => {
      const actual = jest.requireActual("react")
      let call = 0
      return {
        ...actual,
        useContext: () => {
          call += 1
          return call === 1 ? null : { id: "item_1" }
        },
        useId: () => "item_1",
      }
    })

    jest.doMock("@medusajs/ui", () => {
      const React = jest.requireActual("react")
      return {
        clx: (...parts: any[]) => parts.filter(Boolean).join(" "),
        Hint: ({ children, ...props }: any) =>
          React.createElement("hint", props, children),
        Label: ({ children, ...props }: any) =>
          React.createElement("label-component", props, children),
        Text: ({ children, ...props }: any) =>
          React.createElement("text", props, children),
        Tooltip: ({ children, ...props }: any) =>
          React.createElement("tooltip", props, children),
      }
    })

    jest.doMock("@medusajs/icons", () => ({
      InformationCircleSolid: (props: any) =>
        require("react").createElement("info-icon", props),
    }))

    jest.doMock("@radix-ui/react-slot", () => ({
      Slot: ({ children, ...props }: any) =>
        require("react").createElement("slot", props, children),
    }))

    jest.doMock("react-hook-form", () => {
      const React = jest.requireActual("react")
      return {
        Controller: (props: any) => React.createElement("controller", props),
        FormProvider: ({ children, ...props }: any) =>
          React.createElement("form-provider", props, children),
        useFormContext: () => ({
          getFieldState: () => ({ error: undefined }),
        }),
        useFormState: () => ({}),
      }
    })

    const Form = require("../form").Form

    expect(() => Form.Control.render({ children: "input" }, null)).toThrow(
      "reading 'name'"
    )
  })
})
