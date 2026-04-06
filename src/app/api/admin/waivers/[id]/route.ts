import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "waivers.db");

function checkAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return false;
  const token = authHeader.replace("Bearer ", "");
  return token === (process.env.ADMIN_PASSWORD || "admin123");
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const db = new Database(DB_PATH);

    const waiver = db.prepare("SELECT * FROM waivers WHERE id = ?").get(id);
    if (!waiver) {
      db.close();
      return NextResponse.json({ error: "Waiver not found" }, { status: 404 });
    }

    // Delete verification codes for this email too
    db.prepare("DELETE FROM verification_codes WHERE LOWER(email) = LOWER(?)").run(
      (waiver as any).email
    );
    db.prepare("DELETE FROM waivers WHERE id = ?").run(id);
    db.close();

    return NextResponse.json({ success: true, message: "Waiver deleted" });
  } catch (error) {
    console.error("Admin delete error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
