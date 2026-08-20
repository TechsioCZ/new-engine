import { describe, expect, it, vi } from "vitest"
import type { SqlClient, SqlExecutor, SqlPool } from "./sql"
import {
  executeRetriableTransaction,
  isRetryablePostgresError,
} from "./transaction"

const result = (rows: readonly unknown[] = []) => ({
  rows,
  rowCount: rows.length,
})

const client = (
  query: SqlExecutor["query"] = vi.fn(() => Promise.resolve(result()))
): SqlClient => ({
  query,
  release: vi.fn(),
})

describe("Postgres URL registry transaction boundary", () => {
  it("uses explicit bounded READ COMMITTED settings on one leased client", async () => {
    const query = vi.fn(async (_sql: string, _values?: readonly unknown[]) =>
      result()
    )
    const leased = client(query)
    const pool: SqlPool = {
      connect: vi.fn(async () => leased),
      query: vi.fn(async () => result()),
    }

    await expect(
      executeRetriableTransaction(pool, async (executor) => {
        expect(executor).toBe(leased)
        await executor.query("SELECT mutation")
        return "committed"
      })
    ).resolves.toBe("committed")

    expect(query.mock.calls.map(([sql]) => sql)).toEqual([
      "BEGIN ISOLATION LEVEL READ COMMITTED",
      "SET LOCAL lock_timeout = '2s'",
      "SET LOCAL statement_timeout = '5s'",
      "SET LOCAL idle_in_transaction_session_timeout = '5s'",
      "SET CONSTRAINTS ALL DEFERRED",
      "SELECT mutation",
      "COMMIT",
    ])
    expect(leased.release).toHaveBeenCalledOnce()
  })

  it("retries only the bounded transient allowlist with a fresh client", async () => {
    const first = client()
    const second = client()
    const pool: SqlPool = {
      connect: vi
        .fn<() => Promise<SqlClient>>()
        .mockResolvedValueOnce(first)
        .mockResolvedValueOnce(second),
      query: vi.fn(async () => result()),
    }
    let attempt = 0

    await expect(
      executeRetriableTransaction(
        pool,
        () => {
          attempt += 1
          if (attempt === 1) {
            throw Object.assign(new Error("deadlock"), { code: "40P01" })
          }
          return Promise.resolve("retried")
        },
        { random: () => 0, sleep: vi.fn(() => Promise.resolve()) }
      )
    ).resolves.toBe("retried")

    expect(pool.connect).toHaveBeenCalledTimes(2)
    expect(first.query).toHaveBeenLastCalledWith("ROLLBACK")
    expect(first.release).toHaveBeenCalledOnce()
    expect(second.release).toHaveBeenCalledOnce()
  })

  it("does not retry a generic check violation", () => {
    expect(isRetryablePostgresError({ code: "23514" })).toBe(false)
    expect(
      isRetryablePostgresError({
        code: "23503",
        constraint: "url_route_successor_foreign",
      })
    ).toBe(true)
  })

  it.each([
    new Error("Connection terminated unexpectedly"),
    new Error("Query read timeout"),
    Object.assign(new Error("socket reset"), { code: "ECONNRESET" }),
    Object.assign(new Error("broken pipe"), { code: "EPIPE" }),
    Object.assign(new Error("socket timeout"), { code: "ETIMEDOUT" }),
  ])("retries and destroys the lease for ambiguous transport failure", async (failure) => {
    const first = client()
    const second = client()
    const pool: SqlPool = {
      connect: vi
        .fn<() => Promise<SqlClient>>()
        .mockResolvedValueOnce(first)
        .mockResolvedValueOnce(second),
      query: vi.fn(async () => result()),
    }
    let attempt = 0

    await expect(
      executeRetriableTransaction(
        pool,
        () => {
          attempt += 1
          if (attempt === 1) {
            throw failure
          }
          return Promise.resolve("replayed")
        },
        { random: () => 0, sleep: vi.fn(() => Promise.resolve()) }
      )
    ).resolves.toBe("replayed")

    expect(first.release).toHaveBeenCalledWith(failure)
    expect(second.release).toHaveBeenCalledWith(undefined)
  })

  it("retries an ambiguous COMMIT read timeout through a fresh lease", async () => {
    const failure = new Error("Query read timeout")
    const first = client(
      vi.fn((sql: string) =>
        sql === "COMMIT" ? Promise.reject(failure) : Promise.resolve(result())
      )
    )
    const second = client()
    const pool: SqlPool = {
      connect: vi
        .fn<() => Promise<SqlClient>>()
        .mockResolvedValueOnce(first)
        .mockResolvedValueOnce(second),
      query: vi.fn(async () => result()),
    }
    const operation = vi.fn(async () => "ledger-result")

    await expect(
      executeRetriableTransaction(pool, operation, {
        random: () => 0,
        sleep: vi.fn(() => Promise.resolve()),
      })
    ).resolves.toBe("ledger-result")

    expect(operation).toHaveBeenCalledTimes(2)
    expect(first.release).toHaveBeenCalledWith(failure)
    expect(second.release).toHaveBeenCalledWith(undefined)
  })

  it("retries a transient lease failure before BEGIN", async () => {
    const leased = client()
    const pool: SqlPool = {
      connect: vi
        .fn<() => Promise<SqlClient>>()
        .mockRejectedValueOnce(
          Object.assign(new Error("primary unavailable"), { code: "08006" })
        )
        .mockResolvedValueOnce(leased),
      query: vi.fn(async () => result()),
    }

    await expect(
      executeRetriableTransaction(pool, async () => "ok", {
        random: () => 0,
        sleep: vi.fn(() => Promise.resolve()),
      })
    ).resolves.toBe("ok")
    expect(pool.connect).toHaveBeenCalledTimes(2)
  })

  it("destroys a lease after a connection-class failure", async () => {
    const first = client()
    const second = client()
    const connectionError = Object.assign(new Error("connection lost"), {
      code: "08006",
    })
    const pool: SqlPool = {
      connect: vi
        .fn<() => Promise<SqlClient>>()
        .mockResolvedValueOnce(first)
        .mockResolvedValueOnce(second),
      query: vi.fn(async () => result()),
    }
    let attempt = 0

    await executeRetriableTransaction(
      pool,
      () => {
        attempt += 1
        if (attempt === 1) {
          throw connectionError
        }
        return Promise.resolve("ok")
      },
      { random: () => 0, sleep: vi.fn(() => Promise.resolve()) }
    )

    expect(first.release).toHaveBeenCalledWith(connectionError)
    expect(second.release).toHaveBeenCalledWith(undefined)
  })

  it("does not let release errors mask a committed result", async () => {
    const leased = client()
    leased.release = vi.fn(() => {
      throw new Error("pool bookkeeping failed")
    })
    const pool: SqlPool = {
      connect: vi.fn(async () => leased),
      query: vi.fn(async () => result()),
    }

    await expect(
      executeRetriableTransaction(pool, async () => "committed")
    ).resolves.toBe("committed")
  })

  it("rejects retry configuration that can exceed the hard bound", async () => {
    const pool: SqlPool = {
      connect: vi.fn(async () => client()),
      query: vi.fn(async () => result()),
    }
    await expect(
      executeRetriableTransaction(pool, async () => "unused", {
        maxAttempts: 4,
      })
    ).rejects.toBeInstanceOf(RangeError)
    expect(pool.connect).not.toHaveBeenCalled()
  })
})
