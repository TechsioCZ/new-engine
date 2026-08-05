import { ModuleCompanySpendingLimitResetFrequency } from "../types"

interface CompanySpendContext {
  spending_limit_reset_frequency: ModuleCompanySpendingLimitResetFrequency
}

interface EmployeeSpendContext {
  company: CompanySpendContext
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

function getSpendWindow(company: CompanySpendContext): {
  start: Date
  end: Date
} {
  if (!company) {
    return { end: new Date(), start: new Date(0) }
  }

  const now = new Date()
  const resetFrequency = company.spending_limit_reset_frequency

  switch (resetFrequency) {
    case ModuleCompanySpendingLimitResetFrequency.NEVER: {
      return { end: now, start: new Date(0) }
    } // Never resets
    case ModuleCompanySpendingLimitResetFrequency.DAILY: {
      return { end: now, start: new Date(now.setHours(0, 0, 0, 0)) }
    } // Window is the current day up to now
    case ModuleCompanySpendingLimitResetFrequency.WEEKLY: {
      const startOfWeek = new Date(now)
      startOfWeek.setDate(now.getDate() - now.getDay())
      startOfWeek.setHours(0, 0, 0, 0)
      return { end: now, start: startOfWeek } // Window is the current week up to now, starting on Sunday
    }
    case ModuleCompanySpendingLimitResetFrequency.MONTHLY: {
      return {
        end: now,
        start: new Date(now.getFullYear(), now.getMonth(), 1),
      }
    } // Window is the current month up to now
    case ModuleCompanySpendingLimitResetFrequency.YEARLY: {
      return { end: now, start: new Date(now.getFullYear(), 0, 1) }
    } // Window is the current year up to now
    default: {
      return { end: now, start: new Date(0) }
    } // Default to never resetting
  }
}

function getOrderTotalInSpendWindow(
  orders: (OrderSpendContext | null)[],
  spendWindow: { start: Date; end: Date },
): number {
  return (
    orders.reduce((acc, order) => {
      if (!order) {
        return acc
      }

      const orderDate = new Date(order.created_at)
      if (orderDate >= spendWindow.start && orderDate <= spendWindow.end) {
        return acc + order.total
      }
      return acc
    }, 0) || 0
  )
}

export function checkSpendingLimit(
  cart: CartSpendTotal | null,
  customer: CustomerSpendContext | null,
) {
  if (!(cart && customer && customer.employee)) {
    return false
  }

  if (
    !customer?.employee?.spending_limit ||
    customer?.employee?.spending_limit === 0
  ) {
    return false
  }

  const { employee } = customer
  const spendingLimit = employee.spending_limit
  const spendWindow = getSpendWindow(employee.company)
  const spent = getOrderTotalInSpendWindow(customer.orders || [], spendWindow)

  return spent + cart.total > spendingLimit
}
