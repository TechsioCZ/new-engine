import { MedusaError } from "@medusajs/framework/utils"
import { drizzle, type MySql2Database } from "drizzle-orm/mysql2"
import type { SQL } from "drizzle-orm/sql/sql"
import mysql from "mysql2/promise"

class DatabaseModuleService {
  // todo, DB table with connections & admin widget for configuration, currently hardcoded for singular use
  private db_: MySql2Database | undefined = undefined
  private dbInitPromise_: Promise<MySql2Database> | undefined = undefined

  private async initDatabase() {
    if (this.db_ !== undefined) {
      return this.db_
    }
    // Prevent concurrent init races - return existing promise if in-flight
    if (this.dbInitPromise_) {
      return this.dbInitPromise_
    }

    this.dbInitPromise_ = (async () => {
      const connectionString = process.env["LEGACY_DATABASE_URL"]
      if (!connectionString) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "LEGACY_DATABASE_URL environment variable is required for legacy database connection"
        )
      }
      const connection = await mysql.createConnection(connectionString)
      this.db_ = drizzle(connection)
      return this.db_
    })()

    return this.dbInitPromise_
  }

  /**
   * Execute a raw SQL query and return the results
   */
  async sqlRaw<T extends Record<string, unknown> = Record<string, unknown>>(
    sql: SQL<T>
  ): Promise<T[]>
  async sqlRaw(sql: SQL): Promise<unknown[]> {
    const db = await this.initDatabase()
    const [rows] = await db.execute(sql)

    return Array.isArray(rows) ? rows : []
  }
}

export default DatabaseModuleService
