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

describe("CompanyCreateDrawer", () => {
  it("submits create payload and closes drawer on success", async () => {
    const setOpen = jest.fn()
    const mutateAsync = jest.fn(async (_data, options) => {
      await options?.onSuccess?.()
    })
    let companyFormType: any

    let CompanyCreateDrawer: () => any

    jest.isolateModules(() => {
      jest.doMock("react", () => ({
        ...jest.requireActual("react"),
        useState: () => [true, setOpen],
      }))

      jest.doMock("@medusajs/ui", () => {
        const React = jest.requireActual("react")

        const Button = ({ children, ...props }: any) =>
          React.createElement("button-component", props, children)
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

        return { Button, Drawer }
      })

      jest.doMock("../../../../hooks/api", () => ({
        useCreateCompany: () => ({
          mutateAsync,
          isPending: false,
          error: null,
        }),
      }))

      jest.doMock("../company-form", () => {
        companyFormType = ({ children }: any) =>
          jest.requireActual("react").createElement("company-form", {}, children)
        return {
          CompanyForm: companyFormType,
        }
      })

      CompanyCreateDrawer = require("../company-create-drawer").CompanyCreateDrawer
    })

    const tree = CompanyCreateDrawer!()
    const form = collectElements(tree, (element) => element.type === companyFormType)[0]

    await form.props.handleSubmit({ name: "Acme" })

    expect(tree.props.open).toBe(true)
    expect(mutateAsync).toHaveBeenCalledWith(
      { name: "Acme" },
      expect.objectContaining({
        onSuccess: expect.any(Function),
      })
    )
    expect(setOpen).toHaveBeenCalledWith(false)
  })
})

describe("CompanyUpdateDrawer", () => {
  const company = {
    id: "company_1",
    created_at: "2024-01-01",
    updated_at: "2024-01-02",
    employees: [],
    customer_group: null,
    approval_settings: null,
    name: "Old Name",
    email: "old@example.com",
  }

  it("submits update payload, closes drawer, and shows success toast", async () => {
    const setOpen = jest.fn()
    const toastSuccess = jest.fn()
    const toastError = jest.fn()
    const mutateAsync = jest.fn(async (_data, options) => {
      await options?.onSuccess?.()
    })
    let companyFormType: any

    let CompanyUpdateDrawer: (props: any) => any

    jest.isolateModules(() => {
      jest.doMock("@medusajs/ui", () => {
        const React = jest.requireActual("react")

        const Drawer = ({ children, ...props }: any) =>
          React.createElement("drawer-component", props, children)
        Drawer.Content = ({ children, ...props }: any) =>
          React.createElement("drawer-content", props, children)
        Drawer.Header = ({ children, ...props }: any) =>
          React.createElement("drawer-header", props, children)
        Drawer.Title = ({ children, ...props }: any) =>
          React.createElement("drawer-title", props, children)

        return {
          Drawer,
          toast: {
            success: toastSuccess,
            error: toastError,
          },
        }
      })

      jest.doMock("../../../../hooks/api", () => ({
        useUpdateCompany: () => ({
          mutateAsync,
          isPending: false,
          error: null,
        }),
      }))

      jest.doMock("../company-form", () => {
        companyFormType = ({ children }: any) =>
          jest.requireActual("react").createElement("company-form", {}, children)
        return {
          CompanyForm: companyFormType,
        }
      })

      CompanyUpdateDrawer = require("../company-update-drawer").CompanyUpdateDrawer
    })

    const tree = CompanyUpdateDrawer!({
      company,
      open: true,
      setOpen,
    })
    const form = collectElements(tree, (element) => element.type === companyFormType)[0]

    await form.props.handleSubmit({ name: "New Name" })

    expect(form.props.company).toEqual(
      expect.objectContaining({
        name: "Old Name",
        email: "old@example.com",
      })
    )
    expect(form.props.company.id).toBeUndefined()
    expect(mutateAsync).toHaveBeenCalledWith(
      { name: "New Name" },
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      })
    )
    expect(setOpen).toHaveBeenCalledWith(false)
    expect(toastSuccess).toHaveBeenCalledWith(
      "Company New Name updated successfully"
    )
    expect(toastError).not.toHaveBeenCalled()
  })

  it("shows error toast when update fails", async () => {
    const setOpen = jest.fn()
    const toastSuccess = jest.fn()
    const toastError = jest.fn()
    const mutateAsync = jest.fn(async (_data, options) => {
      await options?.onError?.(new Error("boom"))
    })
    let companyFormType: any

    let CompanyUpdateDrawer: (props: any) => any

    jest.isolateModules(() => {
      jest.doMock("@medusajs/ui", () => {
        const React = jest.requireActual("react")

        const Drawer = ({ children, ...props }: any) =>
          React.createElement("drawer-component", props, children)
        Drawer.Content = ({ children, ...props }: any) =>
          React.createElement("drawer-content", props, children)
        Drawer.Header = ({ children, ...props }: any) =>
          React.createElement("drawer-header", props, children)
        Drawer.Title = ({ children, ...props }: any) =>
          React.createElement("drawer-title", props, children)

        return {
          Drawer,
          toast: {
            success: toastSuccess,
            error: toastError,
          },
        }
      })

      jest.doMock("../../../../hooks/api", () => ({
        useUpdateCompany: () => ({
          mutateAsync,
          isPending: false,
          error: null,
        }),
      }))

      jest.doMock("../company-form", () => {
        companyFormType = ({ children }: any) =>
          jest.requireActual("react").createElement("company-form", {}, children)
        return {
          CompanyForm: companyFormType,
        }
      })

      CompanyUpdateDrawer = require("../company-update-drawer").CompanyUpdateDrawer
    })

    const tree = CompanyUpdateDrawer!({
      company,
      open: true,
      setOpen,
    })
    const form = collectElements(tree, (element) => element.type === companyFormType)[0]

    await form.props.handleSubmit({ name: "Broken" })

    expect(setOpen).not.toHaveBeenCalled()
    expect(toastSuccess).not.toHaveBeenCalled()
    expect(toastError).toHaveBeenCalledWith("Failed to update company")
  })
})
