export class OrderNotFoundError extends Error {
  constructor(message = "Objednávka nenalezena") {
    super(message)
    this.name = "OrderNotFoundError"
  }
}
