import { ModuleCompanySpendingLimitResetFrequency } from "../types/company/module"

interface CompanySpendContext {
  spending_limit_reset_frequency: ModuleCompanySpendingLimitResetFrequency
}

interface EmployeeSpendContext {
  company: CompanySpendContext | null | undefined
  spending_limit: number
}

interface OrderSpendContext {
  created_at: Date | string
  total: number
}

interface CartSpendTotal {
  total: number
}

interface CustomerSpendContext {
  employee?: EmployeeSpendContext | null
  orders?: (OrderSpendContext | null)[] | null
}

const getSpendWindow = (
  company: CompanySpendContext | null | undefined,
): { start: Date; end: Date } => {
  if (company === null || company === undefined) {
    return { end: new Date(), start: new Date(0) }
  }

  const now = new Date()
  const resetFrequency = company.spending_limit_reset_frequency

  switch (resetFrequency) {
    case ModuleCompanySpendingLimitResetFrequency.NEVER: {
      return { end: now, start: new Date(0) }
    }
    case ModuleCompanySpendingLimitResetFrequency.DAILY: {
      return { end: now, start: new Date(now.setHours(0, 0, 0, 0)) }
    }
    case ModuleCompanySpendingLimitResetFrequency.WEEKLY: {
      const startOfWeek = new Date(now)
      startOfWeek.setDate(now.getDate() - now.getDay())
      startOfWeek.setHours(0, 0, 0, 0)
      return { end: now, start: startOfWeek }
    }
    case ModuleCompanySpendingLimitResetFrequency.MONTHLY: {
      return {
        end: now,
        start: new Date(now.getFullYear(), now.getMonth(), 1),
      }
    }
    case ModuleCompanySpendingLimitResetFrequency.YEARLY: {
      return { end: now, start: new Date(now.getFullYear(), 0, 1) }
    }
    default: {
      return { end: now, start: new Date(0) }
    }
  }
}

const getOrderTotalInSpendWindow = (
  orders: (OrderSpendContext | null)[],
  spendWindow: { start: Date; end: Date },
): number => {
  let total = 0

  for (const order of orders) {
    if (order === null) {
      continue
    }

    const orderDate = new Date(order.created_at)
    if (orderDate >= spendWindow.start && orderDate <= spendWindow.end) {
      total += order.total
    }
  }

  return Number.isNaN(total) ? 0 : total
}

export const checkSpendingLimit = (
  cart: CartSpendTotal | null,
  customer: CustomerSpendContext | null,
) => {
  if (
    cart === null ||
    customer === null ||
    customer.employee === null ||
    customer.employee === undefined
  ) {
    return false
  }

  if (customer.employee.spending_limit === 0) {
    return false
  }

  const { employee } = customer
  const spendingLimit = employee.spending_limit
  const spendWindow = getSpendWindow(employee.company)
  const spent = getOrderTotalInSpendWindow(customer.orders ?? [], spendWindow)

  return spent + cart.total > spendingLimit
}
