import { MedusaError } from "@medusajs/framework/utils"
import { drizzle } from "drizzle-orm/mysql2"
import type { MySql2Database } from "drizzle-orm/mysql2"
import type { SQL } from "drizzle-orm/sql/sql"
import mysql from "mysql2/promise"

class DatabaseModuleService {
  // The legacy connection is currently configured for one database URL.
  private database: MySql2Database | undefined = undefined
  private dbInitPromise: Promise<MySql2Database> | undefined = undefined

  private async initDatabase() {
    if (this.database !== undefined) {
      return this.database
    }
    // Prevent concurrent init races - return existing promise if in-flight
    if (this.dbInitPromise !== undefined) {
      return await this.dbInitPromise
    }

    this.dbInitPromise = (async () => {
      const connectionString = process.env["LEGACY_DATABASE_URL"]
      if (connectionString === undefined || connectionString.length === 0) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "LEGACY_DATABASE_URL environment variable is required for legacy database connection",
        )
      }
      const connection = await mysql.createConnection(connectionString)
      this.database = drizzle(connection)
      return this.database
    })()

    return await this.dbInitPromise
  }

  /**
   * Execute a raw SQL query and return the results
   */
  async sqlRaw<T = unknown>(sql: SQL<T>): Promise<T[]>
  async sqlRaw(sql: SQL): Promise<unknown[]> {
    const db = await this.initDatabase()
    const [rows] = await db.execute(sql)

    return Array.isArray(rows) ? rows : []
  }
}

export default DatabaseModuleService
