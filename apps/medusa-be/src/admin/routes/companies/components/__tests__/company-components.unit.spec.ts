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

describe("CompanyActionsMenu", () => {
  it("opens drawers and deletes company", async () => {
    const setEditOpen = jest.fn()
    const setCustomerGroupOpen = jest.fn()
    const setApprovalOpen = jest.fn()
    const setDeleteOpen = jest.fn()
    const navigate = jest.fn()
    const toastSuccess = jest.fn()
    const mutateDelete = jest.fn(async (_id, options) => {
      await options?.onSuccess?.()
    })

    let actionMenuType: any
    let deletePromptType: any
    let CompanyActionsMenu: (props: any) => any

    jest.isolateModules(() => {
      jest.doMock("react", () => ({
        ...jest.requireActual("react"),
        useState: jest
          .fn()
          .mockImplementationOnce(() => [false, setEditOpen])
          .mockImplementationOnce(() => [false, setCustomerGroupOpen])
          .mockImplementationOnce(() => [false, setApprovalOpen])
          .mockImplementationOnce(() => [false, setDeleteOpen]),
      }))

      jest.doMock("react-router-dom", () => ({
        useNavigate: () => navigate,
      }))

      jest.doMock("@medusajs/ui", () => ({
        toast: {
          success: toastSuccess,
        },
      }))

      jest.doMock("../../../../components/common", () => {
        actionMenuType = (props: any) =>
          (require("react").createElement("action-menu", props) as any)
        return {
          ActionMenu: actionMenuType,
        }
      })

      jest.doMock("../../../../components/common/delete-prompt", () => {
        deletePromptType = (props: any) =>
          (require("react").createElement("delete-prompt", props) as any)
        return {
          DeletePrompt: deletePromptType,
        }
      })

      jest.doMock("../../../../hooks/api", () => ({
        useDeleteCompany: () => ({
          mutateAsync: mutateDelete,
          isPending: false,
        }),
      }))

      jest.doMock("../", () => {
        const React = require("react")
        return {
          CompanyApprovalSettingsDrawer: (props: any) =>
            React.createElement("approval-drawer", props),
          CompanyCustomerGroupDrawer: (props: any) =>
            React.createElement("customer-group-drawer", props),
          CompanyUpdateDrawer: (props: any) =>
            React.createElement("update-drawer", props),
        }
      })

      CompanyActionsMenu = require("../company-actions-menu").CompanyActionsMenu
    })

    const company = {
      id: "company_1",
      name: "Acme",
    }

    const tree = CompanyActionsMenu!({
      company,
      customerGroups: [{ id: "cg_1", name: "B2B" }],
    })

    const actionMenu = collectElements(
      tree,
      (element) => element.type === actionMenuType
    )[0]
    const deletePrompt = collectElements(
      tree,
      (element) => element.type === deletePromptType
    )[0]

    actionMenu.props.groups[0].actions[0].onClick()
    actionMenu.props.groups[0].actions[1].onClick()
    actionMenu.props.groups[0].actions[2].onClick()
    actionMenu.props.groups[1].actions[0].onClick()

    expect(setEditOpen).toHaveBeenCalledWith(true)
    expect(setCustomerGroupOpen).toHaveBeenCalledWith(true)
    expect(setApprovalOpen).toHaveBeenCalledWith(true)
    expect(setDeleteOpen).toHaveBeenCalledWith(true)

    await deletePrompt.props.handleDelete()

    expect(mutateDelete).toHaveBeenCalledWith(
      "company_1",
      expect.objectContaining({ onSuccess: expect.any(Function) })
    )
    expect(navigate).toHaveBeenCalledWith("/companies")
    expect(toastSuccess).toHaveBeenCalledWith("Company Acme deleted successfully")
  })
})

describe("CompanyApprovalSettingsDrawer", () => {
  it("submits updated settings and closes on success", async () => {
    const setOpen = jest.fn()
    const setAdmin = jest.fn()
    const setSales = jest.fn()
    const mutateAsync = jest.fn(async (_data, options) => {
      await options?.onSuccess?.()
    })
    const toastSuccess = jest.fn()
    const toastError = jest.fn()

    let CompanyApprovalSettingsDrawer: (props: any) => any

    jest.isolateModules(() => {
      jest.doMock("react", () => ({
        ...jest.requireActual("react"),
        useState: jest
          .fn()
          .mockImplementationOnce(() => [true, setAdmin])
          .mockImplementationOnce(() => [false, setSales]),
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

      jest.doMock("../../../../hooks/api", () => ({
        useUpdateApprovalSettings: () => ({
          mutateAsync,
          isPending: false,
        }),
      }))

      jest.doMock("../../../../components/common", () => {
        const React = require("react")
        return {
          CoolSwitch: (props: any) => React.createElement("cool-switch", props),
        }
      })

      CompanyApprovalSettingsDrawer =
        require("../company-approval-settings-drawer").CompanyApprovalSettingsDrawer
    })

    const tree = CompanyApprovalSettingsDrawer!({
      company: {
        id: "company_1",
        approval_settings: {
          id: "settings_1",
          requires_admin_approval: true,
          requires_sales_manager_approval: false,
        },
      },
      open: true,
      setOpen,
    })

    const switches = collectElements(
      tree,
      (element) =>
        typeof element.props?.fieldName === "string" &&
        typeof element.props?.onChange === "function"
    )
    const buttons = collectElements(
      tree,
      (element) =>
        typeof element.props?.onClick === "function" &&
        (element.props.children === "Save" ||
          element.props.children === "Cancel")
    )

    switches[0].props.onChange()
    switches[1].props.onChange()

    expect(setAdmin).toHaveBeenCalledWith(false)
    expect(setSales).toHaveBeenCalledWith(true)

    await buttons[1].props.onClick()

    expect(mutateAsync).toHaveBeenCalledWith(
      {
        id: "settings_1",
        requires_admin_approval: true,
        requires_sales_manager_approval: false,
      },
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      })
    )
    expect(setOpen).toHaveBeenCalledWith(false)
    expect(toastSuccess).toHaveBeenCalledWith(
      "Company approval settings updated successfully"
    )
    expect(toastError).not.toHaveBeenCalled()
  })

  it("shows error toast when settings update fails and supports cancel", async () => {
    const setOpen = jest.fn()
    const mutateAsync = jest.fn(async (_data, options) => {
      await options?.onError?.(new Error("boom"))
    })
    const toastSuccess = jest.fn()
    const toastError = jest.fn()

    let CompanyApprovalSettingsDrawer: (props: any) => any

    jest.isolateModules(() => {
      jest.doMock("react", () => ({
        ...jest.requireActual("react"),
        useState: jest
          .fn()
          .mockImplementationOnce(() => [false, jest.fn()])
          .mockImplementationOnce(() => [true, jest.fn()]),
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

      jest.doMock("../../../../hooks/api", () => ({
        useUpdateApprovalSettings: () => ({
          mutateAsync,
          isPending: true,
        }),
      }))

      jest.doMock("../../../../components/common", () => {
        const React = require("react")
        return {
          CoolSwitch: (props: any) => React.createElement("cool-switch", props),
        }
      })

      CompanyApprovalSettingsDrawer =
        require("../company-approval-settings-drawer").CompanyApprovalSettingsDrawer
    })

    const tree = CompanyApprovalSettingsDrawer!({
      company: {
        id: "company_1",
        approval_settings: {
          id: "settings_1",
          requires_admin_approval: false,
          requires_sales_manager_approval: true,
        },
      },
      open: true,
      setOpen,
    })

    const buttons = collectElements(
      tree,
      (element) =>
        typeof element.props?.onClick === "function" &&
        (element.props.children === "Save" ||
          element.props.children === "Cancel")
    )

    buttons[0].props.onClick()
    expect(setOpen).toHaveBeenCalledWith(false)

    await buttons[1].props.onClick()

    expect(mutateAsync).toHaveBeenCalled()
    expect(toastSuccess).not.toHaveBeenCalled()
    expect(toastError).toHaveBeenCalledWith(
      "Failed to update company approval settings"
    )
  })
})

describe("CompanyCustomerGroupDrawer", () => {
  it("adds and removes company from customer group", async () => {
    const setOpen = jest.fn()
    const addMutate = jest.fn(async (_id, options) => {
      await options?.onSuccess?.()
    })
    const removeMutate = jest.fn(async (_id, options) => {
      await options?.onSuccess?.()
    })
    const toastSuccess = jest.fn()

    let CompanyCustomerGroupDrawer: (props: any) => any

    jest.isolateModules(() => {
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

        const Table = ({ children, ...props }: any) =>
          React.createElement("table-component", props, children)
        Table.Header = ({ children, ...props }: any) =>
          React.createElement("table-header", props, children)
        Table.Row = ({ children, ...props }: any) =>
          React.createElement("table-row", props, children)
        Table.HeaderCell = ({ children, ...props }: any) =>
          React.createElement("table-header-cell", props, children)
        Table.Body = ({ children, ...props }: any) =>
          React.createElement("table-body", props, children)
        Table.Cell = ({ children, ...props }: any) =>
          React.createElement("table-cell", props, children)

        return {
          Button: ({ children, ...props }: any) =>
            React.createElement("button-component", props, children),
          Drawer,
          Hint: ({ children, ...props }: any) =>
            React.createElement("hint-component", props, children),
          Table,
          toast: {
            success: toastSuccess,
            error: jest.fn(),
          },
        }
      })

      jest.doMock("../../../../hooks/api", () => ({
        useAddCompanyToCustomerGroup: () => ({
          mutateAsync: addMutate,
          isPending: false,
        }),
        useRemoveCompanyFromCustomerGroup: () => ({
          mutateAsync: removeMutate,
          isPending: false,
        }),
      }))

      CompanyCustomerGroupDrawer =
        require("../company-customer-group-drawer").CompanyCustomerGroupDrawer
    })

    const tree = CompanyCustomerGroupDrawer!({
      company: {
        id: "company_1",
        name: "Acme",
        employees: [{ id: "emp_1" }, { id: "emp_2" }],
        customer_group: null,
      },
      customerGroups: [
        { id: "cg_1", name: "Group A" },
        { id: "cg_2", name: "Group B" },
      ],
      open: true,
      setOpen,
    })

    const buttons = collectElements(
      tree,
      (element) => typeof element.props?.onClick === "function"
    )

    await buttons[0].props.onClick()
    expect(addMutate).toHaveBeenCalledWith(
      "cg_1",
      expect.objectContaining({ onSuccess: expect.any(Function) })
    )
    expect(setOpen).toHaveBeenCalledWith(false)
    expect(toastSuccess).toHaveBeenCalledWith(
      "Company added to customer group successfully"
    )

    // rerender with existing group to hit remove branch
    const removeTree = CompanyCustomerGroupDrawer!({
      company: {
        id: "company_1",
        name: "Acme",
        employees: [{ id: "emp_1" }],
        customer_group: { id: "cg_1", name: "Group A" },
      },
      customerGroups: [{ id: "cg_1", name: "Group A" }],
      open: true,
      setOpen,
    })

    const removeButton = collectElements(
      removeTree,
      (element) =>
        typeof element.props?.onClick === "function" &&
        element.props.children === "Remove"
    )[0]

    await removeButton.props.onClick()

    expect(removeMutate).toHaveBeenCalledWith(
      "cg_1",
      expect.objectContaining({ onSuccess: expect.any(Function) })
    )
    expect(toastSuccess).toHaveBeenCalledWith(
      "Company removed from customer group successfully"
    )
  })
})
