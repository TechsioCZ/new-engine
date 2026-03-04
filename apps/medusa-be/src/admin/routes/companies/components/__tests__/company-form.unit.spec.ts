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
  const values: string[] = []

  const walk = (value: any) => {
    if (Array.isArray(value)) {
      value.forEach(walk)
      return
    }

    if (typeof value === "string") {
      values.push(value)
      return
    }

    if (!React.isValidElement(value)) {
      return
    }

    walk(value.props?.children)
  }

  walk(node)
  return values
}

const findInputByName = (tree: any, name: string) =>
  collectElements(tree, (element) => element.props?.name === name && !!element.props?.onChange)[0]

const findSelectByName = (tree: any, name: string) =>
  collectElements(
    tree,
    (element) => element.props?.name === name && !!element.props?.onValueChange
  )[0]

const findButtonByText = (tree: any, text: string) =>
  collectElements(
    tree,
    (element) =>
      typeof element.props?.onClick === "function" && element.props?.children === text
  )[0]

const loadCompanyForm = ({
  buildLookupQuery,
  companyInfoResults,
  companyInfoError = null,
  isCompanyInfoFetching = false,
  addressCountData = { count: 12 },
  addressCountError = null,
  isAddressCountFetching = false,
  taxReliabilityData = {
    reliable: false,
    unreliable_published_at: "2024-01-01",
  },
  taxReliabilityError = null,
  isTaxReliabilityFetching = false,
  viesData = { valid: false },
  viesError = null,
  isViesFetching = false,
  regions = [
    {
      currency_code: "usd",
      countries: [
        { iso_2: "us", name: "United States" },
        { iso_2: "cz", name: "Czechia" },
      ],
    },
  ],
}: {
  buildLookupQuery: () => unknown
  companyInfoResults: any[] | undefined
  companyInfoError?: Error | null
  isCompanyInfoFetching?: boolean
  addressCountData?: any
  addressCountError?: Error | null
  isAddressCountFetching?: boolean
  taxReliabilityData?: any
  taxReliabilityError?: Error | null
  isTaxReliabilityFetching?: boolean
  viesData?: any
  viesError?: Error | null
  isViesFetching?: boolean
  regions?: any[]
}) => {
  const state: any[] = []
  let cursor = 0

  const setFormDataMock = jest.fn((value) => {
    state[0] = typeof value === "function" ? value(state[0]) : value
  })
  const setSelectedIndexMock = jest.fn((value) => {
    state[1] = typeof value === "function" ? value(state[1]) : value
  })

  const refetchCompanyInfo = jest.fn().mockResolvedValue({
    data: companyInfoResults,
  })
  const handleSubmit = jest.fn().mockResolvedValue(undefined)

  let CompanyForm: (props: any) => any

  jest.isolateModules(() => {
    jest.doMock("react", () => ({
      ...jest.requireActual("react"),
      useMemo: (factory: () => unknown) => factory(),
      useState: (initialValue: unknown) => {
        const index = cursor++

        if (!(index in state)) {
          state[index] = initialValue
        }

        if (index === 0) {
          return [state[0], setFormDataMock]
        }

        return [state[1], setSelectedIndexMock]
      },
    }))

    jest.doMock("@medusajs/ui", () => {
      const React = jest.requireActual("react")

      const Select = ({ children, ...props }: any) =>
        React.createElement("select-component", props, children)
      Select.Trigger = ({ children, ...props }: any) =>
        React.createElement("select-trigger", props, children)
      Select.Value = ({ children, ...props }: any) =>
        React.createElement("select-value", props, children)
      Select.Content = ({ children, ...props }: any) =>
        React.createElement("select-content", props, children)
      Select.Item = ({ children, ...props }: any) =>
        React.createElement("select-item", props, children)

      const Drawer = ({ children, ...props }: any) =>
        React.createElement("drawer-component", props, children)
      Drawer.Body = ({ children, ...props }: any) =>
        React.createElement("drawer-body", props, children)
      Drawer.Footer = ({ children, ...props }: any) =>
        React.createElement("drawer-footer", props, children)
      Drawer.Close = ({ children, ...props }: any) =>
        React.createElement("drawer-close", props, children)

      return {
        Badge: ({ children, ...props }: any) =>
          React.createElement("badge-component", props, children),
        Button: ({ children, ...props }: any) =>
          React.createElement("button-component", props, children),
        Drawer,
        Input: ({ children, ...props }: any) =>
          React.createElement("input-component", props, children),
        Label: ({ children, ...props }: any) =>
          React.createElement("label-component", props, children),
        Select,
        Text: ({ children, ...props }: any) =>
          React.createElement("text-component", props, children),
      }
    })

    jest.doMock("../../../../hooks/api", () => ({
      useRegions: () => ({
        regions,
        isPending: false,
      }),
      useCompanyCheckCzInfo: () => ({
        data: companyInfoResults,
        isFetching: isCompanyInfoFetching,
        error: companyInfoError,
        refetch: refetchCompanyInfo,
      }),
      useCompanyCheckCzAddressCount: () => ({
        data: addressCountData,
        isFetching: isAddressCountFetching,
        error: addressCountError,
      }),
      useCompanyCheckCzTaxReliability: () => ({
        data: taxReliabilityData,
        isFetching: isTaxReliabilityFetching,
        error: taxReliabilityError,
      }),
      useCompanyCheckVies: () => ({
        data: viesData,
        isFetching: isViesFetching,
        error: viesError,
      }),
    }))

    jest.doMock("../../../../utils", () => ({
      buildCompanyInfoLookupQuery: buildLookupQuery,
      hasAddressCountWarning: (count: number | undefined) => (count ?? 0) > 10,
      isDefined: (value: unknown) => value !== null && value !== undefined,
      normalizeCountryCodeFromCompanyInfo: (countryCode?: string | null) =>
        countryCode ? countryCode.toLowerCase() : null,
      resolveCurrencyFromCountry: (country?: string | null) =>
        country === "cz" ? "czk" : "usd",
      taxReliabilityBadge: () => ({ color: "orange", label: "Unreliable" }),
      toTrimmedOrNull: (value: string) => {
        const trimmed = value.trim()
        return trimmed.length ? trimmed : null
      },
      viesValidationBadge: () => ({ color: "orange", label: "Invalid" }),
    }))

    CompanyForm = require("../company-form").CompanyForm
  })

  const render = (props: any) => {
    cursor = 0
    return CompanyForm!(props)
  }

  return {
    render,
    state,
    handleSubmit,
    refetchCompanyInfo,
    setFormDataMock,
    setSelectedIndexMock,
  }
}

describe("CompanyForm", () => {
  it("handles create-mode interactions: input changes, lookup, apply, and save", async () => {
    const { render, state, handleSubmit, refetchCompanyInfo } = loadCompanyForm({
      buildLookupQuery: () => ({ company_name: "Acme" }),
      companyInfoResults: [
        {
          company_name: "Registry Name",
          street: "Registry Street 1",
          city: "Prague",
          postal_code: "11000",
          country_code: "CZ",
          company_identification_number: "87654321",
          vat_identification_number: "cz87654321",
        },
      ],
    })

    let tree = render({
      handleSubmit,
      loading: false,
      error: null,
    })

    findInputByName(tree, "name").props.onChange({
      target: { name: "name", value: "Acme Edited" },
    })
    findInputByName(tree, "company_identification_number").props.onChange({
      target: { name: "company_identification_number", value: " 12345678 " },
    })
    findInputByName(tree, "vat_identification_number").props.onChange({
      target: { name: "vat_identification_number", value: "cz12345678" },
    })
    findSelectByName(tree, "currency_code").props.onValueChange("eur")
    findSelectByName(tree, "country").props.onValueChange("de")

    await findButtonByText(tree, "Lookup").props.onClick()
    findButtonByText(tree, "Apply Selected Result").props.onClick()

    tree = render({
      handleSubmit,
      loading: false,
      error: null,
    })

    await findButtonByText(tree, "Save").props.onClick()

    expect(refetchCompanyInfo).toHaveBeenCalledTimes(1)
    expect(state[0]).toEqual(
      expect.objectContaining({
        name: "Registry Name",
        address: "Registry Street 1",
        city: "Prague",
        zip: "11000",
        country: "cz",
        currency_code: "czk",
        company_identification_number: "87654321",
        vat_identification_number: "CZ87654321",
      })
    )
    expect(handleSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Registry Name",
      })
    )
  })

  it("does not refetch lookup when lookup query is unavailable", async () => {
    const { render, refetchCompanyInfo } = loadCompanyForm({
      buildLookupQuery: () => undefined,
      companyInfoResults: [],
    })

    const tree = render({
      handleSubmit: jest.fn().mockResolvedValue(undefined),
      loading: false,
      error: null,
    })

    await findButtonByText(tree, "Lookup").props.onClick()

    expect(refetchCompanyInfo).not.toHaveBeenCalled()
  })

  it("uses existing company data in update mode and submits it", async () => {
    const existingCompany = {
      name: "Existing Company",
      email: "existing@example.com",
      country: "us",
      currency_code: "usd",
    }

    const { render, handleSubmit } = loadCompanyForm({
      buildLookupQuery: () => ({ company_name: "Ignored" }),
      companyInfoResults: undefined,
    })

    const tree = render({
      company: existingCompany,
      handleSubmit,
      loading: false,
      error: new Error("boom"),
    })

    const lookupButton = findButtonByText(tree, "Lookup")
    expect(lookupButton).toBeUndefined()

    await findButtonByText(tree, "Save").props.onClick()

    expect(handleSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Existing Company",
        email: "existing@example.com",
      })
    )
  })

  it("renders lookup/check error states and does not reset selected index for empty lookup results", async () => {
    const {
      render,
      refetchCompanyInfo,
      setSelectedIndexMock,
    } = loadCompanyForm({
      buildLookupQuery: () => ({ company_name: "Acme" }),
      companyInfoResults: [],
      companyInfoError: new Error("Lookup endpoint unavailable"),
      addressCountError: new Error("Address endpoint unavailable"),
      viesError: new Error("VIES endpoint unavailable"),
      taxReliabilityError: new Error("Tax endpoint unavailable"),
    })

    const tree = render({
      handleSubmit: jest.fn().mockResolvedValue(undefined),
      loading: false,
      error: null,
    })

    await findButtonByText(tree, "Lookup").props.onClick()

    expect(refetchCompanyInfo).toHaveBeenCalled()
    expect(setSelectedIndexMock).not.toHaveBeenCalled()

    const text = collectText(tree).join(" ")
    expect(text).toContain("No company was found for the current lookup value.")
    expect(text).toContain("Lookup endpoint unavailable")
    expect(text).toContain("Address endpoint unavailable")
    expect(text).toContain("VIES endpoint unavailable")
    expect(text).toContain("Tax endpoint unavailable")
  })

  it("applies lookup result with fallback values and covers non-warning check paths", () => {
    const { render, state } = loadCompanyForm({
      buildLookupQuery: () => ({ company_name: "Acme" }),
      companyInfoResults: [
        {
          company_name: "",
          street: "",
          city: "",
          postal_code: "",
          country_code: null,
          company_identification_number: "",
          vat_identification_number: null,
        },
      ],
      addressCountData: { count: 2 },
      viesData: { valid: true },
      taxReliabilityData: { reliable: true },
      regions: [
        {
          currency_code: "usd",
          countries: [
            { iso_2: undefined, name: undefined },
            { iso_2: "cz", name: "Czechia" },
          ],
        },
      ],
    })

    let tree = render({
      handleSubmit: jest.fn().mockResolvedValue(undefined),
      loading: false,
      error: null,
    })

    findInputByName(tree, "name").props.onChange({
      target: { name: "name", value: "Existing Name" },
    })
    findInputByName(tree, "address").props.onChange({
      target: { name: "address", value: "Existing Street" },
    })
    findInputByName(tree, "city").props.onChange({
      target: { name: "city", value: "Existing City" },
    })
    findInputByName(tree, "zip").props.onChange({
      target: { name: "zip", value: "12345" },
    })
    findInputByName(tree, "company_identification_number").props.onChange({
      target: { name: "company_identification_number", value: " 12345678 " },
    })
    findInputByName(tree, "vat_identification_number").props.onChange({
      target: { name: "vat_identification_number", value: "   " },
    })

    findButtonByText(tree, "Apply Selected Result").props.onClick()

    tree = render({
      handleSubmit: jest.fn().mockResolvedValue(undefined),
      loading: false,
      error: null,
    })

    const text = collectText(tree).join(" ")
    expect(text).toContain("Unnamed company")
    expect(text).toContain("No ICO")
    expect(text).toContain("OK (2)")

    expect(state[0]).toEqual(
      expect.objectContaining({
        name: "Existing Name",
        address: "Existing Street",
        city: "Existing City",
        zip: "12345",
        company_identification_number: "12345678",
        vat_identification_number: null,
      })
    )
  })

  it("shows checking badges while company checks are running", () => {
    const { render } = loadCompanyForm({
      buildLookupQuery: () => undefined,
      companyInfoResults: undefined,
      isAddressCountFetching: true,
      isViesFetching: true,
      isTaxReliabilityFetching: true,
    })

    const tree = render({
      handleSubmit: jest.fn().mockResolvedValue(undefined),
      loading: false,
      error: null,
    })

    expect(collectText(tree).join(" ")).toContain("Checking")
  })
})
