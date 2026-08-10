import { NextResponse } from "next/server"

const getHealth = () => NextResponse.json({ status: "ok" })

export { getHealth as GET }
