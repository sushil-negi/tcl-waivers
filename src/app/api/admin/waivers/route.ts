import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "waivers.db");

function getDb() {
  return new Database(DB_PATH, { readonly: true });
}

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

    const db = getDb();

    let query = "SELECT * FROM waivers";
    const conditions: string[] = [];
    const params: string[] = [];

    if (search) {
      conditions.push("(LOWER(full_name) LIKE ? OR LOWER(email) LIKE ?)");
      params.push(`%${search.toLowerCase()}%`, `%${search.toLowerCase()}%`);
    }

    if (team) {
      conditions.push("team = ?");
      params.push(team);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY created_at DESC";

    const waivers = db.prepare(query).all(...params);
    db.close();

    return NextResponse.json({ waivers });
  } catch (error) {
    console.error("Admin list error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
