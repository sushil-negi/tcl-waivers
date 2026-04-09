import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { checkAuth } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  const auth = checkAuth(request);
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const team = searchParams.get("team") || "";

    let result;

    if (search && team) {
      // Use position() to match multi-team players (comma-separated)
      result = await sql`
        SELECT * FROM waivers
        WHERE (LOWER(full_name) LIKE ${`%${search.toLowerCase()}%`} OR LOWER(email) LIKE ${`%${search.toLowerCase()}%`})
        AND POSITION(${team} IN team) > 0
        ORDER BY created_at DESC
      `;
    } else if (search) {
      result = await sql`
        SELECT * FROM waivers
        WHERE LOWER(full_name) LIKE ${`%${search.toLowerCase()}%`} OR LOWER(email) LIKE ${`%${search.toLowerCase()}%`}
        ORDER BY created_at DESC
      `;
    } else if (team) {
      // Match team anywhere in the comma-separated list
      result = await sql`
        SELECT * FROM waivers
        WHERE POSITION(${team} IN team) > 0
        ORDER BY created_at DESC
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
