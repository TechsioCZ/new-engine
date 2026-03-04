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

const collectText = (node: any): string[] => {
  const found: string[] = []

  const walk = (value: any) => {
    if (Array.isArray(value)) {
      value.forEach(walk)
      return
    }

    if (typeof value === "string") {
      found.push(value)
      return
    }

    if (!React.isValidElement(value)) {
      return
    }

    walk(value.props?.children)
  }

  walk(node)
  return found
}

describe("Companies page", () => {
  beforeEach(() => {
    ;(global as any).window = {
      location: {
        href: "",
      },
    }
  })

  it("renders companies table, handles row navigation, and exposes route config", () => {
    let Companies: () => any
    let config: any

    jest.isolateModules(() => {
      jest.doMock("@medusajs/admin-sdk", () => ({
        defineRouteConfig: (value: unknown) => value,
      }))

      jest.doMock("@medusajs/icons", () => ({
        BuildingStorefront: () => null,
      }))

      jest.doMock("@medusajs/ui", () => {
        const React = require("react")

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
          Avatar: ({ children, ...props }: any) =>
            React.createElement("avatar-component", props, children),
          Badge: ({ children, ...props }: any) =>
            React.createElement("badge-component", props, children),
          Container: ({ children, ...props }: any) =>
            React.createElement("container-component", props, children),
          Heading: ({ children, ...props }: any) =>
            React.createElement("heading-component", props, children),
          Table,
          Text: ({ children, ...props }: any) =>
            React.createElement("text-component", props, children),
          Toaster: ({ children, ...props }: any) =>
            React.createElement("toaster-component", props, children),
        }
      })

      jest.doMock("../../../hooks/api", () => ({
        useCompanies: () => ({
          data: {
            companies: [
              {
                id: "company_1",
                name: "Acme",
                phone: "+420123",
                email: "acme@example.com",
                address: "Main 1",
                city: "Prague",
                state: "PRG",
                zip: "11000",
                employees: [{ id: "emp_1" }],
                customer_group: { id: "cg_1", name: "B2B" },
              },
              {
                id: "company_2",
                name: "Globex",
                phone: "+420999",
                email: "globex@example.com",
                address: "Side 2",
                city: "Brno",
                state: "BRN",
                zip: "60200",
                employees: undefined,
                customer_group: null,
              },
            ],
          },
          isPending: false,
        }),
        useAdminCustomerGroups: () => ({
          data: [{ id: "cg_1", name: "B2B" }],
        }),
      }))

      jest.doMock("../components", () => {
        const React = require("react")
        return {
          CompanyActionsMenu: (props: any) =>
            React.createElement("company-actions-menu", props),
          CompanyCreateDrawer: (props: any) =>
            React.createElement("company-create-drawer", props),
        }
      })

      const module = require("../page")
      Companies = module.default
      config = module.config
    })

    const tree = Companies!()

    const row = collectElements(
      tree,
      (element) =>
        typeof element.props?.onClick === "function" &&
        typeof element.props?.className === "string" &&
        element.props.className.includes("cursor-pointer")
    )[0]

    row.props.onClick()
    expect((global as any).window.location.href).toBe("/app/companies/company_1")

    const actionCell = collectElements(
      tree,
      (element) =>
        typeof element.props?.onClick === "function" &&
        !element.props?.className
    )[0]

    const stopPropagation = jest.fn()
    actionCell.props.onClick({ stopPropagation })
    expect(stopPropagation).toHaveBeenCalled()

    const allText = collectText(tree).join(" ")
    expect(allText).toContain("-")

    expect(config.label).toBe("Companies")
    expect(config.icon).toBeDefined()
  })

  it("shows loading text while pending", () => {
    let Companies: () => any

    jest.isolateModules(() => {
      jest.doMock("@medusajs/admin-sdk", () => ({
        defineRouteConfig: (value: unknown) => value,
      }))

      jest.doMock("@medusajs/icons", () => ({
        BuildingStorefront: () => null,
      }))

      jest.doMock("@medusajs/ui", () => {
        const React = require("react")

        const Table = ({ children, ...props }: any) =>
          React.createElement("table-component", props, children)
        Table.Header = ({ children, ...props }: any) =>
          React.createElement("table-header", props, children)
        Table.Row = ({ children, ...props }: any) =>
          React.createElement("table-row", props, children)
        Table.HeaderCell = ({ children, ...props }: any) =>
          React.createElement("table-header-cell", props, children)

        return {
          Avatar: ({ children, ...props }: any) =>
            React.createElement("avatar-component", props, children),
          Badge: ({ children, ...props }: any) =>
            React.createElement("badge-component", props, children),
          Container: ({ children, ...props }: any) =>
            React.createElement("container-component", props, children),
          Heading: ({ children, ...props }: any) =>
            React.createElement("heading-component", props, children),
          Table,
          Text: ({ children, ...props }: any) =>
            React.createElement("text-component", props, children),
          Toaster: ({ children, ...props }: any) =>
            React.createElement("toaster-component", props, children),
        }
      })

      jest.doMock("../../../hooks/api", () => ({
        useCompanies: () => ({
          data: undefined,
          isPending: true,
        }),
        useAdminCustomerGroups: () => ({
          data: [],
        }),
      }))

      jest.doMock("../components", () => {
        const React = require("react")
        return {
          CompanyActionsMenu: (props: any) =>
            React.createElement("company-actions-menu", props),
          CompanyCreateDrawer: (props: any) =>
            React.createElement("company-create-drawer", props),
        }
      })

      Companies = require("../page").default
    })

    const tree = Companies!()
    const textNodes = collectText(tree)

    expect(textNodes).toContain("Loading...")
  })
})
