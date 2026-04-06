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
    const total = await sql`SELECT COUNT(*) as count FROM waivers`;

    const teamBreakdown = await sql`
      SELECT team, COUNT(*) as count FROM waivers
      WHERE team IS NOT NULL
      GROUP BY team ORDER BY count DESC
    `;

    const recentSignings = await sql`
      SELECT full_name, email, team, signed_at, document_id
      FROM waivers ORDER BY created_at DESC LIMIT 10
    `;

    return NextResponse.json({
      totalWaivers: parseInt(total.rows[0].count),
      teamBreakdown: teamBreakdown.rows,
      recentSignings: recentSignings.rows,
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json({
      totalWaivers: 0,
      teamBreakdown: [],
      recentSignings: [],
    });
  }
}
