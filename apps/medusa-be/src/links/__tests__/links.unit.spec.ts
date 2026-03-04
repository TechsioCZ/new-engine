type LoadedDefineLinkModule = {
  module: any
  defineLinkMock: jest.Mock
}

const mockDefaultModule = (path: string, value: unknown) => {
  jest.doMock(
    path,
    () => ({
      __esModule: true,
      default: value,
    }),
    { virtual: true }
  )
}

const loadDefineLinkModule = async (
  modulePath: string,
  setupMocks: () => void
): Promise<LoadedDefineLinkModule> => {
  jest.resetModules()

  const defineLinkMock = jest.fn((...args: unknown[]) => ({ args }))

  jest.doMock(
    "@medusajs/framework/utils",
    () => ({
      defineLink: (...args: unknown[]) => defineLinkMock(...args),
    }),
    { virtual: true }
  )

  setupMocks()

  const module = await import(modulePath)
  return { module, defineLinkMock }
}

describe("link definitions", () => {
  it("defines cart-approval-status link with delete cascade", async () => {
    const cartModule = { linkable: { cart: "cart" } }
    const approvalModule = { linkable: { approvalStatus: "approval-status" } }

    const { module, defineLinkMock } = await loadDefineLinkModule(
      "../cart-approval-status",
      () => {
        mockDefaultModule("@medusajs/medusa/cart", cartModule)
        mockDefaultModule("../../modules/approval", approvalModule)
      }
    )

    expect(defineLinkMock).toHaveBeenCalledWith(cartModule.linkable.cart, {
      linkable: approvalModule.linkable.approvalStatus,
      deleteCascade: true,
    })
    expect(module.default).toEqual({
      args: [
        cartModule.linkable.cart,
        {
          linkable: approvalModule.linkable.approvalStatus,
          deleteCascade: true,
        },
      ],
    })
  })

  it("defines cart-approvals link as list with delete cascade", async () => {
    const cartModule = { linkable: { cart: "cart" } }
    const approvalModule = { linkable: { approval: "approval" } }

    const { defineLinkMock } = await loadDefineLinkModule("../cart-approvals", () => {
      mockDefaultModule("@medusajs/medusa/cart", cartModule)
      mockDefaultModule("../../modules/approval", approvalModule)
    })

    expect(defineLinkMock).toHaveBeenCalledWith(cartModule.linkable.cart, {
      linkable: approvalModule.linkable.approval,
      deleteCascade: true,
      isList: true,
    })
  })

  it("defines company-approval-setting link", async () => {
    const companyModule = { linkable: { company: "company" } }
    const approvalModule = { linkable: { approvalSettings: "approval-settings" } }

    const { defineLinkMock } = await loadDefineLinkModule(
      "../company-approval-setting",
      () => {
        mockDefaultModule("../../modules/company", companyModule)
        mockDefaultModule("../../modules/approval", approvalModule)
      }
    )

    expect(defineLinkMock).toHaveBeenCalledWith(
      companyModule.linkable.company,
      approvalModule.linkable.approvalSettings
    )
  })

  it("defines company-carts link as list", async () => {
    const companyModule = { linkable: { company: "company" } }
    const cartModule = { linkable: { cart: "cart" } }

    const { defineLinkMock } = await loadDefineLinkModule("../company-carts", () => {
      mockDefaultModule("../../modules/company", companyModule)
      mockDefaultModule("@medusajs/medusa/cart", cartModule)
    })

    expect(defineLinkMock).toHaveBeenCalledWith(companyModule.linkable.company, {
      linkable: cartModule.linkable.cart,
      isList: true,
    })
  })

  it("defines company-customer-group link", async () => {
    const companyModule = { linkable: { company: "company" } }
    const customerModule = { linkable: { customerGroup: "customer-group" } }

    const { defineLinkMock } = await loadDefineLinkModule(
      "../company-customer-group",
      () => {
        mockDefaultModule("../../modules/company", companyModule)
        mockDefaultModule("@medusajs/medusa/customer", customerModule)
      }
    )

    expect(defineLinkMock).toHaveBeenCalledWith(
      companyModule.linkable.company,
      customerModule.linkable.customerGroup
    )
  })

  it("defines employee-customer link", async () => {
    const companyModule = { linkable: { employee: "employee" } }
    const customerModule = { linkable: { customer: "customer" } }

    const { defineLinkMock } = await loadDefineLinkModule("../employee-customer", () => {
      mockDefaultModule("../../modules/company", companyModule)
      mockDefaultModule("@medusajs/medusa/customer", customerModule)
    })

    expect(defineLinkMock).toHaveBeenCalledWith(
      companyModule.linkable.employee,
      customerModule.linkable.customer
    )
  })

  it("defines order-company link", async () => {
    const companyModule = { linkable: { company: "company" } }
    const orderModule = { linkable: { order: "order" } }

    const { defineLinkMock } = await loadDefineLinkModule("../order-company", () => {
      mockDefaultModule("../../modules/company", companyModule)
      mockDefaultModule("@medusajs/medusa/order", orderModule)
    })

    expect(defineLinkMock).toHaveBeenCalledWith(
      orderModule.linkable.order,
      companyModule.linkable.company
    )
  })

  it("registers quote custom links", async () => {
    jest.resetModules()

    const setCustomLink = jest.fn()
    const modules = {
      ORDER: "order",
      CART: "cart",
      USER: "user",
      CUSTOMER: "customer",
    }

    jest.doMock(
      "@medusajs/framework/utils",
      () => ({
        Modules: modules,
      }),
      { virtual: true }
    )

    jest.doMock(
      "@medusajs/modules-sdk",
      () => ({
        MedusaModule: {
          setCustomLink: (...args: unknown[]) => setCustomLink(...args),
        },
      }),
      { virtual: true }
    )

    jest.doMock(
      "../../modules/quote",
      () => ({
        QUOTE_MODULE: "quote",
      }),
      { virtual: true }
    )

    await import("../quote-links")

    expect(setCustomLink).toHaveBeenCalledTimes(1)
    const factory = setCustomLink.mock.calls[0][0]
    const customLink = factory()

    expect(customLink.isLink).toBe(true)
    expect(customLink.isReadOnlyLink).toBe(true)
    expect(customLink.extends).toHaveLength(5)
    expect(customLink.extends.map((item: any) => item.relationship.alias)).toEqual([
      "draft_order",
      "cart",
      "order_change",
      "admin",
      "customer",
    ])
    expect(customLink.extends[0].relationship.serviceName).toBe(modules.ORDER)
    expect(customLink.extends[1].relationship.serviceName).toBe(modules.CART)
    expect(customLink.extends[3].relationship.serviceName).toBe(modules.USER)
    expect(customLink.extends[4].relationship.serviceName).toBe(modules.CUSTOMER)
  })
})
