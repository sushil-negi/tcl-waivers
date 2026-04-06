import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

function checkAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return false;
  const token = authHeader.replace("Bearer ", "");
  return token === (process.env.ADMIN_PASSWORD || "admin123");
}

export async function GET(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const team = searchParams.get("team") || "";

    let result;

    if (search && team) {
      result = await sql`
        SELECT * FROM waivers
        WHERE (LOWER(full_name) LIKE ${`%${search.toLowerCase()}%`} OR LOWER(email) LIKE ${`%${search.toLowerCase()}%`})
        AND team = ${team}
        ORDER BY created_at DESC
      `;
    } else if (search) {
      result = await sql`
        SELECT * FROM waivers
        WHERE LOWER(full_name) LIKE ${`%${search.toLowerCase()}%`} OR LOWER(email) LIKE ${`%${search.toLowerCase()}%`}
        ORDER BY created_at DESC
      `;
    } else if (team) {
      result = await sql`
        SELECT * FROM waivers WHERE team = ${team} ORDER BY created_at DESC
      `;
    } else {
      result = await sql`SELECT * FROM waivers ORDER BY created_at DESC`;
    }

    return NextResponse.json({ waivers: result.rows });
  } catch (error) {
    console.error("Admin list error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
