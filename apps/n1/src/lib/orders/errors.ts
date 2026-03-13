export class OrderNotFoundError extends Error {
  constructor(message = "Objednavka nenalezena") {
    super(message)
    this.name = "OrderNotFoundError"
  }
}
