import { Navigate } from "react-router-dom"

export const handle = {
  breadcrumb: () => "Order Statuses",
}

const OrderStatusesPage = () => <Navigate replace to="/order-expedition" />

export default OrderStatusesPage
