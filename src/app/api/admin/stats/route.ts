import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = path.join(process.cwd(), "data", "waivers.db");

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
    if (!fs.existsSync(DB_PATH)) {
      return NextResponse.json({
        totalWaivers: 0,
        teamBreakdown: [],
        recentSignings: [],
      });
    }

    const db = new Database(DB_PATH, { readonly: true });

    const total = db.prepare("SELECT COUNT(*) as count FROM waivers").get() as any;

    const teamBreakdown = db
      .prepare(
        "SELECT team, COUNT(*) as count FROM waivers WHERE team IS NOT NULL GROUP BY team ORDER BY count DESC"
      )
      .all();

    const recentSignings = db
      .prepare(
        "SELECT full_name, email, team, signed_at, document_id FROM waivers ORDER BY created_at DESC LIMIT 10"
      )
      .all();

    db.close();

    return NextResponse.json({
      totalWaivers: total.count,
      teamBreakdown,
      recentSignings,
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
