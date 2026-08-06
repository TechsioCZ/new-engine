export const OrdersTableHeader = () => (
  <div className="grid grid-cols-12 gap-orders-card border-orders-border border-b bg-orders-overlay p-sm font-medium text-orders-fg-secondary text-orders-sm uppercase tracking-wider">
    <div className="col-span-2">Číslo</div>
    <div className="col-span-2">Datum</div>
    <div className="col-span-4">Položky</div>
    <div className="col-span-2 text-right">Celkem</div>
    <div className="col-span-2 text-right">Akce</div>
  </div>
)
