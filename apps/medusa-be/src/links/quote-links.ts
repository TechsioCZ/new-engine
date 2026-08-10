import { MedusaModule } from "@medusajs/framework/modules-sdk"
import { Modules } from "@medusajs/framework/utils"

import { QUOTE_MODULE } from "../modules/quote"

MedusaModule.setCustomLink(() => ({
  extends: [
    {
      relationship: {
        alias: "draft_order",
        args: {
          methodSuffix: "Orders",
        },
        entity: "Order",
        foreignKey: "draft_order_id",
        primaryKey: "id",
        serviceName: Modules.ORDER,
      },
      serviceName: QUOTE_MODULE,
    },
    {
      relationship: {
        alias: "cart",
        args: {
          methodSuffix: "Carts",
        },
        entity: "Cart",
        foreignKey: "cart_id",
        primaryKey: "id",
        serviceName: Modules.CART,
      },
      serviceName: QUOTE_MODULE,
    },
    {
      relationship: {
        alias: "order_change",
        args: {
          methodSuffix: "OrderChanges",
        },
        entity: "OrderChange",
        foreignKey: "order_change_id",
        primaryKey: "id",
        serviceName: Modules.ORDER,
      },
      serviceName: QUOTE_MODULE,
    },
    {
      relationship: {
        alias: "admin",
        args: {
          methodSuffix: "Users",
        },
        entity: "User",
        foreignKey: "admin_id",
        primaryKey: "id",
        serviceName: Modules.USER,
      },
      serviceName: QUOTE_MODULE,
    },
    {
      relationship: {
        alias: "customer",
        args: {
          methodSuffix: "Customers",
        },
        entity: "Customer",
        foreignKey: "customer_id",
        primaryKey: "id",
        serviceName: Modules.CUSTOMER,
      },
      serviceName: QUOTE_MODULE,
    },
  ],
  isLink: true,
  isReadOnlyLink: true,
}))
