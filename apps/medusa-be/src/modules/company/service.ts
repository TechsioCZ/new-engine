import { MedusaService } from "@medusajs/framework/utils"

import { Company, Employee } from "./models/company"

class CompanyModuleService extends MedusaService({
  Company,
  Employee,
}) {}

export default CompanyModuleService
