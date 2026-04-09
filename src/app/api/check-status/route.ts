import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    const { rows } = await sql`
      SELECT full_name, team, document_id FROM waivers
      WHERE LOWER(email) = LOWER(${email})
    `;

    if (rows.length > 0) {
      const waiver = rows[0];
      return NextResponse.json({
        alreadySigned: true,
        fullName: waiver.full_name,
        currentTeams: waiver.team || "",
        documentId: waiver.document_id,
      });
    }

    return NextResponse.json({ alreadySigned: false });
  } catch (error) {
    console.error("Check status error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
