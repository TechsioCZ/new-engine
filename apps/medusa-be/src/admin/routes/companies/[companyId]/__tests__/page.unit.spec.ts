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

const renderElements = (value: any): any => {
  if (Array.isArray(value)) {
    return value.map(renderElements)
  }

  if (!React.isValidElement(value)) {
    return value
  }

  if (typeof value.type === "function") {
    return renderElements(value.type(value.props))
  }

  return React.cloneElement(value, {
    ...value.props,
    children: renderElements(value.props?.children),
  })
}

const collectText = (node: any): string[] => {
  const text: string[] = []

  const walk = (value: any) => {
    if (Array.isArray(value)) {
      value.forEach(walk)
      return
    }

    if (typeof value === "string") {
      text.push(value)
      return
    }

    if (!React.isValidElement(value)) {
      return
    }

    walk(value.props?.children)
  }

  walk(node)
  return text
}

const loadCompanyDetails = ({
  company,
  addressCountData,
  addressCountError,
  isAddressCountFetching,
  taxReliabilityData,
  taxReliabilityError,
  isTaxReliabilityFetching,
  viesData,
  viesError,
  isViesFetching,
}: {
  company: any
  addressCountData: any
  addressCountError: any
  isAddressCountFetching: boolean
  taxReliabilityData: any
  taxReliabilityError: any
  isTaxReliabilityFetching: boolean
  viesData: any
  viesError: any
  isViesFetching: boolean
}) => {
  const formatAmount = jest.fn((value: number, currency: string) => `${value}-${currency}`)

  let CompanyDetails: () => any

  jest.isolateModules(() => {
    jest.doMock("react-router-dom", () => ({
      useParams: () => ({
        companyId: "company_1",
      }),
    }))

    jest.doMock("@medusajs/icons", () => ({
      ExclamationCircle: (props: any) =>
        require("react").createElement("exclamation-circle", props),
    }))

    jest.doMock("@medusajs/ui", () => {
      const React = jest.requireActual("react")

      const Table = ({ children, ...props }: any) =>
        React.createElement("table-component", props, children)
      Table.Body = ({ children, ...props }: any) =>
        React.createElement("table-body", props, children)
      Table.Row = ({ children, ...props }: any) =>
        React.createElement("table-row", props, children)
      Table.Cell = ({ children, ...props }: any) =>
        React.createElement("table-cell", props, children)
      Table.Header = ({ children, ...props }: any) =>
        React.createElement("table-header", props, children)
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

    jest.doMock("../../../../hooks/api", () => ({
      useCompany: () => ({
        data: company ? { company } : undefined,
        isPending: false,
      }),
      useAdminCustomerGroups: () => ({
        data: { customer_groups: [] },
      }),
      useCompanyCheckCzAddressCount: () => ({
        data: addressCountData,
        error: addressCountError,
        isFetching: isAddressCountFetching,
      }),
      useCompanyCheckCzTaxReliability: () => ({
        data: taxReliabilityData,
        error: taxReliabilityError,
        isFetching: isTaxReliabilityFetching,
      }),
      useCompanyCheckVies: () => ({
        data: viesData,
        error: viesError,
        isFetching: isViesFetching,
      }),
    }))

    jest.doMock("../../../../utils", () => ({
      formatAmount,
      hasAddressCountWarning: (count: number | undefined) => (count ?? 0) > 10,
      taxReliabilityBadge: (reliable?: boolean) =>
        reliable
          ? { color: "green", label: "Reliable" }
          : { color: "orange", label: "Unreliable" },
      viesValidationBadge: (result?: { valid?: boolean }) =>
        result?.valid
          ? { color: "green", label: "Valid" }
          : { color: "orange", label: "Invalid" },
    }))

    jest.doMock("../../components", () => {
      const React = jest.requireActual("react")
      return {
        CompanyActionsMenu: (props: any) =>
          React.createElement("company-actions-menu", props),
      }
    })

    jest.doMock("../../components/employees", () => {
      const React = jest.requireActual("react")
      return {
        EmployeeCreateDrawer: (props: any) =>
          React.createElement("employee-create-drawer", props),
        EmployeesActionsMenu: (props: any) =>
          React.createElement("employees-actions-menu", props),
      }
    })

    CompanyDetails = require("../page").default
  })

  return {
    CompanyDetails: CompanyDetails!,
    formatAmount,
  }
}

describe("CompanyDetails page", () => {
  beforeEach(() => {
    ;(global as any).window = {
      location: {
        href: "",
      },
    }
  })

  it("returns not-found state when company is missing", () => {
    const { CompanyDetails } = loadCompanyDetails({
      company: null,
      addressCountData: undefined,
      addressCountError: null,
      isAddressCountFetching: false,
      taxReliabilityData: undefined,
      taxReliabilityError: null,
      isTaxReliabilityFetching: false,
      viesData: undefined,
      viesError: null,
      isViesFetching: false,
    })

    const tree = CompanyDetails()
    expect(tree.type).toBe("div")
    expect(tree.props.children).toBe("Company not found")
  })

  it("renders company + employees table and handles row click", () => {
    const company = {
      id: "company_1",
      name: "Acme",
      email: "acme@example.com",
      phone: "+420123456",
      address: "Main 1",
      city: "Prague",
      state: "PRG",
      company_identification_number: "12345678",
      vat_identification_number: "CZ12345678",
      currency_code: "usd",
      customer_group: { name: "B2B" },
      approval_settings: {
        requires_admin_approval: true,
        requires_sales_manager_approval: false,
      },
      employees: [
        {
          id: "emp_1",
          is_admin: true,
          spending_limit: 15000,
          customer: {
            id: "cust_1",
            first_name: "Alice",
            last_name: "Buyer",
            email: "alice@example.com",
          },
        },
      ],
    }

    const { CompanyDetails, formatAmount } = loadCompanyDetails({
      company,
      addressCountData: { count: 12 },
      addressCountError: null,
      isAddressCountFetching: false,
      taxReliabilityData: {
        reliable: false,
        unreliable_published_at: "2024-01-01",
      },
      taxReliabilityError: null,
      isTaxReliabilityFetching: false,
      viesData: { valid: false },
      viesError: null,
      isViesFetching: false,
    })

    const tree = CompanyDetails()

    const employeeRow = collectElements(
      tree,
      (element) => typeof element.props?.onClick === "function"
    ).find((element) => element.props.className === "cursor-pointer")

    employeeRow.props.onClick()
    expect((global as any).window.location.href).toBe("/app/customers/cust_1")

    const actionsCell = collectElements(
      tree,
      (element) => typeof element.props?.onClick === "function"
    ).find((element) => element.props.className === undefined)

    const stopPropagation = jest.fn()
    actionsCell.props.onClick({ stopPropagation })
    expect(stopPropagation).toHaveBeenCalled()

    expect(formatAmount).toHaveBeenCalledWith(15000, "usd")
  })

  it("renders empty-state text when company has no employees", () => {
    const company = {
      id: "company_1",
      name: "Acme",
      email: "acme@example.com",
      phone: "+420123456",
      address: "Main 1",
      city: "Prague",
      state: "PRG",
      company_identification_number: "12345678",
      vat_identification_number: "CZ12345678",
      currency_code: "usd",
      customer_group: null,
      approval_settings: {
        requires_admin_approval: false,
        requires_sales_manager_approval: false,
      },
      employees: [],
    }

    const { CompanyDetails } = loadCompanyDetails({
      company,
      addressCountData: undefined,
      addressCountError: null,
      isAddressCountFetching: false,
      taxReliabilityData: undefined,
      taxReliabilityError: null,
      isTaxReliabilityFetching: false,
      viesData: undefined,
      viesError: null,
      isViesFetching: false,
    })

    const tree = CompanyDetails()
    const text = collectText(tree).join(" ")

    expect(text).toContain("No records")
    expect(text).toContain("This company doesn't have any employees.")
  })

  it("uses fallback values for no-vat companies and low address-count checks", () => {
    const company = {
      id: "company_1",
      name: "Acme",
      email: "acme@example.com",
      phone: "+420123456",
      address: "Main 1",
      city: "Prague",
      state: "PRG",
      company_identification_number: null,
      vat_identification_number: null,
      currency_code: undefined,
      customer_group: null,
      approval_settings: {
        requires_admin_approval: false,
        requires_sales_manager_approval: false,
      },
      employees: [
        {
          id: "emp_1",
          is_admin: false,
          spending_limit: 500,
          customer: {
            id: "cust_1",
            first_name: undefined,
            last_name: "Buyer",
            email: "buyer@example.com",
          },
        },
      ],
    }

    const { CompanyDetails, formatAmount } = loadCompanyDetails({
      company,
      addressCountData: { count: 2 },
      addressCountError: null,
      isAddressCountFetching: false,
      taxReliabilityData: undefined,
      taxReliabilityError: null,
      isTaxReliabilityFetching: false,
      viesData: undefined,
      viesError: null,
      isViesFetching: false,
    })

    const tree = CompanyDetails()
    const renderedTree = renderElements(tree)
    const text = collectText(tree).join(" ")

    const avatars = collectElements(
      renderedTree,
      (element) => element.type === "avatar-component"
    )
    expect(avatars.some((avatar) => avatar.props.fallback === "")).toBe(true)
    expect(text).toContain("OK (2)")
    expect(text).toContain("Not run")
    expect(formatAmount).toHaveBeenCalledWith(500, "USD")
  })

  it("shows checking badges while company checks are in progress", () => {
    const company = {
      id: "company_1",
      name: "Acme",
      currency_code: "usd",
      vat_identification_number: "CZ123",
      employees: [],
      approval_settings: {
        requires_admin_approval: false,
        requires_sales_manager_approval: false,
      },
    }

    const { CompanyDetails } = loadCompanyDetails({
      company,
      addressCountData: undefined,
      addressCountError: null,
      isAddressCountFetching: true,
      taxReliabilityData: undefined,
      taxReliabilityError: null,
      isTaxReliabilityFetching: true,
      viesData: undefined,
      viesError: null,
      isViesFetching: true,
    })

    const text = collectText(CompanyDetails()).join(" ")
    expect(text).toContain("Checking")
  })

  it("shows unavailable badges when check endpoints fail", () => {
    const company = {
      id: "company_1",
      name: "Acme",
      currency_code: "usd",
      vat_identification_number: "CZ123",
      employees: [],
      approval_settings: {
        requires_admin_approval: false,
        requires_sales_manager_approval: false,
      },
    }

    const { CompanyDetails } = loadCompanyDetails({
      company,
      addressCountData: undefined,
      addressCountError: new Error("address failed"),
      isAddressCountFetching: false,
      taxReliabilityData: undefined,
      taxReliabilityError: new Error("tax failed"),
      isTaxReliabilityFetching: false,
      viesData: undefined,
      viesError: new Error("vies failed"),
      isViesFetching: false,
    })

    const text = collectText(CompanyDetails()).join(" ")
    expect(text).toContain("Check unavailable")
  })
})
