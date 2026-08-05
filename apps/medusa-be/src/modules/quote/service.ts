import { MedusaService } from "@medusajs/framework/utils"

import { Message, Quote } from "./models"

class QuoteModuleService extends MedusaService({ Message, Quote }) {}

export default QuoteModuleService
