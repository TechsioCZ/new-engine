import React from "react"

const collectElements = (node: any, predicate: (value: any) => boolean): any[] => {
  const found: any[] = []

  const walk = (value: any) => {
    if (Array.isArray(value)) {
      value.forEach(walk)
      return
    }

    if (!React.isValidElement(value)) {
      return
    }

    if (predicate(value)) {
      found.push(value)
    }

    walk(value.props?.children)
  }

  walk(node)
  return found
}

describe("EmployeesActionsMenu", () => {
  it("opens edit/delete actions and deletes employee", async () => {
    const setEditOpen = jest.fn()
    const setDeleteOpen = jest.fn()
    const mutateDelete = jest.fn(async (_id, options) => {
      await options?.onSuccess?.()
    })
    const toastSuccess = jest.fn()

    let deletePromptType: any
    let EmployeesActionsMenu: (props: any) => any

    jest.isolateModules(() => {
      jest.doMock("react", () => ({
        ...jest.requireActual("react"),
        useState: jest
          .fn()
          .mockImplementationOnce(() => [false, setEditOpen])
          .mockImplementationOnce(() => [false, setDeleteOpen]),
      }))

      jest.doMock("@medusajs/ui", () => {
        const React = require("react")

        const DropdownMenu = ({ children, ...props }: any) =>
          React.createElement("dropdown-menu", props, children)
        DropdownMenu.Trigger = ({ children, ...props }: any) =>
          React.createElement("dropdown-trigger", props, children)
        DropdownMenu.Content = ({ children, ...props }: any) =>
          React.createElement("dropdown-content", props, children)
        DropdownMenu.Item = ({ children, ...props }: any) =>
          React.createElement("dropdown-item", props, children)
        DropdownMenu.Separator = ({ children, ...props }: any) =>
          React.createElement("dropdown-separator", props, children)

        return {
          DropdownMenu,
          IconButton: ({ children, ...props }: any) =>
            React.createElement("icon-button", props, children),
          toast: {
            success: toastSuccess,
          },
        }
      })

      jest.doMock("../../../../../hooks/api", () => ({
        useDeleteEmployee: () => ({
          mutateAsync: mutateDelete,
          isPending: false,
        }),
      }))

      jest.doMock("../../../../../components/common", () => {
        deletePromptType = (props: any) =>
          (require("react").createElement("delete-prompt", props) as any)
        return {
          DeletePrompt: deletePromptType,
        }
      })

      jest.doMock("../", () => {
        const React = require("react")
        return {
          EmployeesUpdateDrawer: (props: any) =>
            React.createElement("employees-update-drawer", props),
        }
      })

      EmployeesActionsMenu = require("../employees-actions-menu").EmployeesActionsMenu
    })

    const tree = EmployeesActionsMenu!({
      company: { id: "company_1" },
      employee: { id: "emp_1", company_id: "company_1" },
    })

    const menuItems = collectElements(
      tree,
      (element) =>
        typeof element.props?.onClick === "function" &&
        typeof element.props?.className === "string" &&
        element.props.className.includes("gap-x-2")
    )

    menuItems[0].props.onClick()
    menuItems[1].props.onClick()

    expect(setEditOpen).toHaveBeenCalledWith(true)
    expect(setDeleteOpen).toHaveBeenCalledWith(true)

    const deletePrompt = collectElements(
      tree,
      (element) => element.type === deletePromptType
    )[0]

    await deletePrompt.props.handleDelete()

    expect(mutateDelete).toHaveBeenCalledWith(
      "emp_1",
      expect.objectContaining({ onSuccess: expect.any(Function) })
    )
    expect(toastSuccess).toHaveBeenCalledWith("Employee deleted successfully")
  })
})

describe("EmployeeCreateDrawer", () => {
  it("creates customer+employee and closes on success", async () => {
    const setOpen = jest.fn()
    const createCustomer = jest.fn(async () => ({
      customer: {
        id: "cust_1",
        first_name: "Alice",
        last_name: "Buyer",
      },
    }))
    const createEmployee = jest.fn(async () => ({ id: "emp_1" }))
    const toastSuccess = jest.fn()
    const toastError = jest.fn()

    let formType: any
    let EmployeeCreateDrawer: (props: any) => any

    jest.isolateModules(() => {
      jest.doMock("react", () => ({
        ...jest.requireActual("react"),
        useState: () => [true, setOpen],
      }))

      jest.doMock("@medusajs/ui", () => {
        const React = require("react")
        const Drawer = ({ children, ...props }: any) =>
          React.createElement("drawer-component", props, children)
        Drawer.Trigger = ({ children, ...props }: any) =>
          React.createElement("drawer-trigger", props, children)
        Drawer.Content = ({ children, ...props }: any) =>
          React.createElement("drawer-content", props, children)
        Drawer.Header = ({ children, ...props }: any) =>
          React.createElement("drawer-header", props, children)
        Drawer.Title = ({ children, ...props }: any) =>
          React.createElement("drawer-title", props, children)

        return {
          Button: ({ children, ...props }: any) =>
            React.createElement("button-component", props, children),
          Drawer,
          toast: {
            success: toastSuccess,
            error: toastError,
          },
        }
      })

      jest.doMock("../../../../../hooks/api", () => ({
        useCreateEmployee: () => ({
          mutateAsync: createEmployee,
          isPending: false,
          error: null,
        }),
        useAdminCreateCustomer: () => ({
          mutateAsync: createCustomer,
          isPending: false,
          error: null,
        }),
      }))

      jest.doMock("../employees-create-form", () => {
        formType = (props: any) =>
          (require("react").createElement("employees-create-form", props) as any)
        return {
          EmployeesCreateForm: formType,
        }
      })

      EmployeeCreateDrawer = require("../employees-create-drawer").EmployeeCreateDrawer
    })

    const tree = EmployeeCreateDrawer!({
      company: { id: "company_1", name: "Acme" },
    })

    const form = collectElements(tree, (element) => element.type === formType)[0]

    await form.props.handleSubmit({
      email: "alice@example.com",
      first_name: "Alice",
      last_name: "Buyer",
      phone: "+420123",
      spending_limit: 1000,
      is_admin: true,
    })

    expect(createCustomer).toHaveBeenCalledWith(
      expect.objectContaining({
        company_name: "Acme",
        email: "alice@example.com",
      })
    )
    expect(createEmployee).toHaveBeenCalledWith(
      expect.objectContaining({
        customer_id: "cust_1",
        spending_limit: 1000,
        is_admin: true,
      })
    )
    expect(setOpen).toHaveBeenCalledWith(false)
    expect(toastSuccess).toHaveBeenCalledWith(
      "Employee Alice Buyer created successfully"
    )
    expect(toastError).not.toHaveBeenCalled()
  })

  it("shows error when customer creation fails", async () => {
    const setOpen = jest.fn()
    const createCustomer = jest.fn(async () => ({ customer: {} }))
    const createEmployee = jest.fn()
    const toastError = jest.fn()

    let formType: any
    let EmployeeCreateDrawer: (props: any) => any

    jest.isolateModules(() => {
      jest.doMock("react", () => ({
        ...jest.requireActual("react"),
        useState: () => [true, setOpen],
      }))

      jest.doMock("@medusajs/ui", () => {
        const React = require("react")
        const Drawer = ({ children, ...props }: any) =>
          React.createElement("drawer-component", props, children)
        Drawer.Trigger = ({ children, ...props }: any) =>
          React.createElement("drawer-trigger", props, children)
        Drawer.Content = ({ children, ...props }: any) =>
          React.createElement("drawer-content", props, children)
        Drawer.Header = ({ children, ...props }: any) =>
          React.createElement("drawer-header", props, children)
        Drawer.Title = ({ children, ...props }: any) =>
          React.createElement("drawer-title", props, children)

        return {
          Button: ({ children, ...props }: any) =>
            React.createElement("button-component", props, children),
          Drawer,
          toast: {
            success: jest.fn(),
            error: toastError,
          },
        }
      })

      jest.doMock("../../../../../hooks/api", () => ({
        useCreateEmployee: () => ({
          mutateAsync: createEmployee,
          isPending: false,
          error: null,
        }),
        useAdminCreateCustomer: () => ({
          mutateAsync: createCustomer,
          isPending: false,
          error: null,
        }),
      }))

      jest.doMock("../employees-create-form", () => {
        formType = (props: any) =>
          (require("react").createElement("employees-create-form", props) as any)
        return {
          EmployeesCreateForm: formType,
        }
      })

      EmployeeCreateDrawer = require("../employees-create-drawer").EmployeeCreateDrawer
    })

    const tree = EmployeeCreateDrawer!({
      company: { id: "company_1", name: "Acme" },
    })
    const form = collectElements(tree, (element) => element.type === formType)[0]

    await form.props.handleSubmit({
      email: "alice@example.com",
      first_name: "Alice",
      last_name: "Buyer",
      phone: "+420123",
      spending_limit: 1000,
      is_admin: true,
    })

    expect(createEmployee).not.toHaveBeenCalled()
    expect(setOpen).not.toHaveBeenCalled()
    expect(toastError).toHaveBeenCalledWith("Failed to create customer")
  })
})

describe("Employees forms and update drawer", () => {
  beforeEach(() => {
    jest.resetModules()
  })

  it("submits create form data with parsed values", () => {
    const state: any[] = []
    const setState = jest.fn((next) => {
      state[0] = typeof next === "function" ? next(state[0]) : next
    })

    let EmployeesCreateForm: (props: any) => any

    jest.isolateModules(() => {
      jest.dontMock("../employees-create-form")

      jest.doMock("react", () => ({
        ...jest.requireActual("react"),
        useState: (initialValue: unknown) => {
          if (state.length === 0) {
            state.push(initialValue)
          }
          return [state[0], setState]
        },
      }))

      jest.doMock("@medusajs/ui", () => {
        const React = require("react")
        const Drawer = ({ children, ...props }: any) =>
          React.createElement("drawer-component", props, children)
        Drawer.Body = ({ children, ...props }: any) =>
          React.createElement("drawer-body", props, children)
        Drawer.Footer = ({ children, ...props }: any) =>
          React.createElement("drawer-footer", props, children)
        Drawer.Close = ({ children, ...props }: any) =>
          React.createElement("drawer-close", props, children)
        return {
          Button: ({ children, ...props }: any) =>
            React.createElement("button-component", props, children),
          CurrencyInput: ({ children, ...props }: any) =>
            React.createElement("currency-input", props, children),
          Drawer,
          Input: ({ children, ...props }: any) =>
            React.createElement("input-component", props, children),
          Label: ({ children, ...props }: any) =>
            React.createElement("label-component", props, children),
          Text: ({ children, ...props }: any) =>
            React.createElement("text-component", props, children),
        }
      })

      jest.doMock("../../../../../components/common", () => {
        const React = require("react")
        return {
          CoolSwitch: (props: any) => React.createElement("cool-switch", props),
        }
      })

      jest.doMock("../../../../../utils", () => ({
        currencySymbolMap: {
          usd: "$",
        },
      }))

      EmployeesCreateForm = require("../employees-create-form").EmployeesCreateForm
    })

    const handleSubmit = jest.fn().mockResolvedValue(undefined)
    const tree = EmployeesCreateForm!({
      company: { id: "company_1", currency_code: "usd" },
      handleSubmit,
      loading: false,
      error: null,
    })

    const form = collectElements(tree, (element) => element.type === "form")[0]
    ;(form ?? tree).props.onSubmit({ preventDefault: jest.fn() })

    expect(handleSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        company_id: "company_1",
        spending_limit: 0,
        is_admin: false,
      })
    )
  })

  it("handles create-form field updates, loading label, and error rendering", () => {
    const setState = jest.fn()
    const state: any[] = []
    let inputType: any
    let currencyInputType: any
    let buttonType: any
    let textType: any
    let EmployeesCreateForm: (props: any) => any

    jest.isolateModules(() => {
      jest.dontMock("../employees-create-form")

      jest.doMock("react", () => ({
        ...jest.requireActual("react"),
        useState: (initialValue: unknown) => {
          if (state.length === 0) {
            state.push(initialValue)
          }
          return [state[0], setState]
        },
      }))

      jest.doMock("@medusajs/ui", () => {
        const React = require("react")
        const Drawer = ({ children, ...props }: any) =>
          React.createElement("drawer-component", props, children)
        Drawer.Body = ({ children, ...props }: any) =>
          React.createElement("drawer-body", props, children)
        Drawer.Footer = ({ children, ...props }: any) =>
          React.createElement("drawer-footer", props, children)
        Drawer.Close = ({ children, ...props }: any) =>
          React.createElement("drawer-close", props, children)

        inputType = ({ children, ...props }: any) =>
          React.createElement("input-component", props, children)
        currencyInputType = ({ children, ...props }: any) =>
          React.createElement("currency-input", props, children)
        buttonType = ({ children, ...props }: any) =>
          React.createElement("button-component", props, children)
        textType = ({ children, ...props }: any) =>
          React.createElement("text-component", props, children)

        return {
          Button: buttonType,
          CurrencyInput: currencyInputType,
          Drawer,
          Input: inputType,
          Label: ({ children, ...props }: any) =>
            React.createElement("label-component", props, children),
          Text: textType,
        }
      })

      jest.doMock("../../../../../components/common", () => {
        const React = require("react")
        return {
          CoolSwitch: (props: any) => React.createElement("cool-switch", props),
        }
      })

      jest.doMock("../../../../../utils", () => ({
        currencySymbolMap: {
          USD: "$",
        },
      }))

      EmployeesCreateForm = require("../employees-create-form").EmployeesCreateForm
    })

    const handleSubmit = jest.fn().mockResolvedValue(undefined)
    const tree = EmployeesCreateForm!({
      company: { id: "company_1", currency_code: undefined },
      handleSubmit,
      loading: true,
      error: new Error("Create failed"),
    })

    const inputs = collectElements(
      tree,
      (element) =>
        element.type === inputType && typeof element.props?.onChange === "function"
    )

    inputs[0].props.onChange({
      target: { type: "text", name: "first_name", value: "Alice" },
    })

    inputs[0].props.onChange({
      target: {
        type: "checkbox",
        name: "is_admin",
        checked: true,
        value: "ignored",
      },
    })

    const currencyInput = collectElements(
      tree,
      (element) =>
        element.type === currencyInputType &&
        typeof element.props?.onChange === "function"
    )[0]

    currencyInput.props.onChange({
      target: { value: "$1,250" },
    })

    const switchNode = collectElements(
      tree,
      (element) =>
        element.props?.fieldName === "is_admin" &&
        typeof element.props?.onChange === "function"
    )[0]
    switchNode.props.onChange(true)

    expect(setState).toHaveBeenCalledWith(
      expect.objectContaining({ first_name: "Alice" })
    )
    expect(setState).toHaveBeenCalledWith(
      expect.objectContaining({ is_admin: true })
    )
    expect(setState).toHaveBeenCalledWith(
      expect.objectContaining({ spending_limit: "1250" })
    )

    const submitButton = collectElements(
      tree,
      (element) => element.type === buttonType && element.props?.type === "submit"
    )[0]
    expect(submitButton.props.children).toBe("Saving...")

    const errorText = collectElements(tree, (element) => element.type === textType)[0]
    expect(errorText.props.children).toBe("Create failed")

    const form = collectElements(tree, (element) => element.type === "form")[0]
    ;(form ?? tree).props.onSubmit({ preventDefault: jest.fn() })

    expect(handleSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        company_id: "company_1",
        spending_limit: 0,
      })
    )
  })

  it("submits update form and update drawer callback", async () => {
    const state: any[] = []
    const setState = jest.fn((next) => {
      state[0] = typeof next === "function" ? next(state[0]) : next
    })

    let EmployeesUpdateForm: (props: any) => any
    let EmployeesUpdateDrawer: (props: any) => any

    const mutateAsync = jest.fn(async (_data, options) => {
      await options?.onSuccess?.()
    })
    const setOpen = jest.fn()
    const toastSuccess = jest.fn()

    jest.isolateModules(() => {
      jest.dontMock("../employees-update-form")

      jest.doMock("react", () => ({
        ...jest.requireActual("react"),
        useState: (initialValue: unknown) => {
          if (state.length === 0) {
            state.push(initialValue)
          }
          return [state[0], setState]
        },
      }))

      jest.doMock("@medusajs/ui", () => {
        const React = require("react")
        const Drawer = ({ children, ...props }: any) =>
          React.createElement("drawer-component", props, children)
        Drawer.Content = ({ children, ...props }: any) =>
          React.createElement("drawer-content", props, children)
        Drawer.Header = ({ children, ...props }: any) =>
          React.createElement("drawer-header", props, children)
        Drawer.Title = ({ children, ...props }: any) =>
          React.createElement("drawer-title", props, children)
        Drawer.Body = ({ children, ...props }: any) =>
          React.createElement("drawer-body", props, children)
        Drawer.Footer = ({ children, ...props }: any) =>
          React.createElement("drawer-footer", props, children)
        Drawer.Close = ({ children, ...props }: any) =>
          React.createElement("drawer-close", props, children)

        const Table = ({ children, ...props }: any) =>
          React.createElement("table-component", props, children)
        Table.Body = ({ children, ...props }: any) =>
          React.createElement("table-body", props, children)
        Table.Row = ({ children, ...props }: any) =>
          React.createElement("table-row", props, children)
        Table.Cell = ({ children, ...props }: any) =>
          React.createElement("table-cell", props, children)

        return {
          Button: ({ children, ...props }: any) =>
            React.createElement("button-component", props, children),
          Container: ({ children, ...props }: any) =>
            React.createElement("container-component", props, children),
          CurrencyInput: ({ children, ...props }: any) =>
            React.createElement("currency-input", props, children),
          Drawer,
          Label: ({ children, ...props }: any) =>
            React.createElement("label-component", props, children),
          Table,
          Text: ({ children, ...props }: any) =>
            React.createElement("text-component", props, children),
        }
      })

      jest.doMock("../../../../../components/common", () => {
        const React = require("react")
        return {
          CoolSwitch: (props: any) => React.createElement("cool-switch", props),
        }
      })

      jest.doMock("../../../../../utils", () => ({
        currencySymbolMap: {
          usd: "$",
        },
      }))

      jest.doMock("../../../../../hooks/api", () => ({
        useUpdateEmployee: () => ({
          mutateAsync,
          isPending: false,
          error: null,
        }),
      }))

      EmployeesUpdateForm = require("../employees-update-form").EmployeesUpdateForm
      EmployeesUpdateDrawer = require("../employees-update-drawer").EmployeesUpdateDrawer
    })

    const handleSubmit = jest.fn().mockResolvedValue(undefined)
    const updateFormTree = EmployeesUpdateForm!({
      company: { id: "company_1", name: "Acme", currency_code: "usd" },
      employee: {
        id: "emp_1",
        spending_limit: 100,
        is_admin: true,
        customer: {
          id: "cust_1",
          first_name: "Alice",
          last_name: "Buyer",
          email: "alice@example.com",
          phone: "+420123",
        },
      },
      handleSubmit,
      loading: false,
      error: null,
    })

    const currency = collectElements(
      updateFormTree,
      (element) =>
        element.props?.name === "spending_limit" &&
        typeof element.props?.onChange === "function"
    )[0]
    const switchNode = collectElements(
      updateFormTree,
      (element) =>
        element.props?.fieldName === "is_admin" &&
        typeof element.props?.onChange === "function"
    )[0]

    currency.props.onChange({
      target: { value: "$250.5" },
    })
    switchNode.props.onChange(false)

    updateFormTree.props.onSubmit({ preventDefault: jest.fn() })

    expect(handleSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "emp_1",
        spending_limit: 100,
        is_admin: true,
      })
    )

    const drawerTree = EmployeesUpdateDrawer!({
      company: { id: "company_1", currency_code: "usd" },
      employee: {
        id: "emp_1",
        company_id: "company_1",
        customer: { email: "alice@example.com" },
      },
      open: true,
      setOpen,
      toast: { success: toastSuccess },
    })

    const form = collectElements(
      drawerTree,
      (element) => element.props?.handleSubmit
    )[0]

    await form.props.handleSubmit({ is_admin: true })

    expect(mutateAsync).toHaveBeenCalledWith(
      { is_admin: true },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    )
    expect(setOpen).toHaveBeenCalledWith(false)
    expect(toastSuccess).toHaveBeenCalledWith(
      "Employee alice@example.com updated successfully"
    )
  })

  it("handles update-form fallback currency/default spending-limit branches", () => {
    const state: any[] = []
    const setState = jest.fn((next) => {
      state[0] = typeof next === "function" ? next(state[0]) : next
    })

    let EmployeesUpdateForm: (props: any) => any
    let currencyInputType: any
    let buttonType: any

    jest.isolateModules(() => {
      jest.dontMock("../employees-update-form")

      jest.doMock("react", () => ({
        ...jest.requireActual("react"),
        useState: (initialValue: unknown) => {
          if (state.length === 0) {
            state.push(initialValue)
          }
          return [state[0], setState]
        },
      }))

      jest.doMock("@medusajs/ui", () => {
        const React = require("react")
        const Drawer = ({ children, ...props }: any) =>
          React.createElement("drawer-component", props, children)
        Drawer.Body = ({ children, ...props }: any) =>
          React.createElement("drawer-body", props, children)
        Drawer.Footer = ({ children, ...props }: any) =>
          React.createElement("drawer-footer", props, children)
        Drawer.Close = ({ children, ...props }: any) =>
          React.createElement("drawer-close", props, children)

        const Table = ({ children, ...props }: any) =>
          React.createElement("table-component", props, children)
        Table.Body = ({ children, ...props }: any) =>
          React.createElement("table-body", props, children)
        Table.Row = ({ children, ...props }: any) =>
          React.createElement("table-row", props, children)
        Table.Cell = ({ children, ...props }: any) =>
          React.createElement("table-cell", props, children)

        currencyInputType = ({ children, ...props }: any) =>
          React.createElement("currency-input", props, children)
        buttonType = ({ children, ...props }: any) =>
          React.createElement("button-component", props, children)

        return {
          Button: buttonType,
          Container: ({ children, ...props }: any) =>
            React.createElement("container-component", props, children),
          CurrencyInput: currencyInputType,
          Drawer,
          Label: ({ children, ...props }: any) =>
            React.createElement("label-component", props, children),
          Table,
          Text: ({ children, ...props }: any) =>
            React.createElement("text-component", props, children),
        }
      })

      jest.doMock("../../../../../components/common", () => {
        const React = require("react")
        return {
          CoolSwitch: (props: any) => React.createElement("cool-switch", props),
        }
      })

      jest.doMock("../../../../../utils", () => ({
        currencySymbolMap: {
          USD: "$",
        },
      }))

      EmployeesUpdateForm = require("../employees-update-form").EmployeesUpdateForm
    })

    const handleSubmit = jest.fn().mockResolvedValue(undefined)
    const tree = EmployeesUpdateForm!({
      company: { id: "company_1", name: "Acme", currency_code: undefined },
      employee: {
        id: "emp_2",
        spending_limit: undefined,
        is_admin: false,
        customer: {
          id: "cust_2",
          first_name: "Bob",
          last_name: "Buyer",
          email: "bob@example.com",
          phone: "+420987",
        },
      },
      handleSubmit,
      loading: true,
      error: new Error("Update failed"),
    })

    const currencyInput = collectElements(
      tree,
      (element) =>
        element.type === currencyInputType && typeof element.props?.onChange === "function"
    )[0]

    expect(currencyInput.props.code).toBe("USD")
    expect(currencyInput.props.symbol).toBe("$")

    currencyInput.props.onChange({
      target: { value: "" },
    })

    const rerenderedTree = EmployeesUpdateForm!({
      company: { id: "company_1", name: "Acme", currency_code: undefined },
      employee: {
        id: "emp_2",
        spending_limit: undefined,
        is_admin: false,
        customer: {
          id: "cust_2",
          first_name: "Bob",
          last_name: "Buyer",
          email: "bob@example.com",
          phone: "+420987",
        },
      },
      handleSubmit,
      loading: true,
      error: new Error("Update failed"),
    })

    const form = collectElements(rerenderedTree, (element) => element.type === "form")[0]
    ;(form ?? tree).props.onSubmit({ preventDefault: jest.fn() })

    expect(handleSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "emp_2",
        spending_limit: undefined,
        raw_spending_limit: { value: undefined },
      })
    )

    const submitButton = collectElements(
      tree,
      (element) => element.type === buttonType && element.props?.type === "submit"
    )[0]
    expect(submitButton.props.children).toBe("Saving...")
  })
})
