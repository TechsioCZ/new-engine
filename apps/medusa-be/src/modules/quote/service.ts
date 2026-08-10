import { MedusaService } from "@medusajs/framework/utils"

import { Message, Quote } from "./models/quote"

class QuoteModuleService extends MedusaService({ Message, Quote }) {}

export default QuoteModuleService
