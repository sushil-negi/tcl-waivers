import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

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

    const { rows } = await sql`SELECT * FROM waivers WHERE id = ${id}`;
    if (rows.length === 0) {
      return NextResponse.json({ error: "Waiver not found" }, { status: 404 });
    }

    const waiver = rows[0];

    // Delete verification codes for this email too
    await sql`DELETE FROM verification_codes WHERE LOWER(email) = LOWER(${waiver.email})`;
    await sql`DELETE FROM waivers WHERE id = ${id}`;

    return NextResponse.json({ success: true, message: "Waiver deleted" });
  } catch (error) {
    console.error("Admin delete error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
