import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

function checkAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return false;
  const token = authHeader.replace("Bearer ", "");
  return token === (process.env.ADMIN_PASSWORD || "admin123");
}

function escapeCsv(value: any): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { rows } = await sql`
      SELECT
        document_id, full_name, email, phone, date_of_birth,
        team, cricclubs_id, is_minor, guardian_name, guardian_relationship,
        emergency_contact_name, emergency_contact_phone,
        ip_address, signed_at, signed_at_utc, drive_file_url
      FROM waivers
      ORDER BY created_at DESC
    `;

    const headers = [
      "Document ID",
      "Full Name",
      "Email",
      "Phone",
      "Date of Birth",
      "Team",
      "CricClubs Player ID",
      "Is Minor",
      "Guardian Name",
      "Guardian Relationship",
      "Emergency Contact Name",
      "Emergency Contact Phone",
      "IP Address",
      "Signed At (Local)",
      "Signed At (UTC)",
      "Drive File URL",
    ];

    const csvRows = rows.map((row) =>
      [
        row.document_id,
        row.full_name,
        row.email,
        row.phone,
        row.date_of_birth,
        row.team,
        row.cricclubs_id,
        row.is_minor ? "Yes" : "No",
        row.guardian_name,
        row.guardian_relationship,
        row.emergency_contact_name,
        row.emergency_contact_phone,
        row.ip_address,
        row.signed_at,
        row.signed_at_utc,
        row.drive_file_url,
      ]
        .map(escapeCsv)
        .join(",")
    );

    const csv = [headers.join(","), ...csvRows].join("\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=tcl-waivers-export-${new Date().toISOString().split("T")[0]}.csv`,
      },
    });
  } catch (error) {
    console.error("CSV export error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
