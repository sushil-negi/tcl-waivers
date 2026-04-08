import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { google } from "googleapis";

function checkAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return false;
  const token = authHeader.replace("Bearer ", "");
  return token === (process.env.ADMIN_PASSWORD || "admin123");
}

function getDriveAuth() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });
  return oauth2Client;
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
    const { searchParams } = new URL(request.url);
    const deleteDrive = searchParams.get("deleteDrive") === "true";

    const { rows } = await sql`SELECT * FROM waivers WHERE id = ${id}`;
    if (rows.length === 0) {
      return NextResponse.json({ error: "Waiver not found" }, { status: 404 });
    }

    const waiver = rows[0];

    // Delete from Google Drive if requested and file exists
    let driveDeleted = false;
    if (deleteDrive && waiver.drive_file_id) {
      try {
        const auth = getDriveAuth();
        const drive = google.drive({ version: "v3", auth });
        await drive.files.delete({ fileId: waiver.drive_file_id });
        driveDeleted = true;
      } catch (driveError) {
        console.error("Drive delete error:", driveError);
        // Continue with DB deletion even if Drive delete fails
      }
    }

    // Delete verification codes for this email
    await sql`DELETE FROM verification_codes WHERE LOWER(email) = LOWER(${waiver.email})`;
    await sql`DELETE FROM waivers WHERE id = ${id}`;

    return NextResponse.json({
      success: true,
      message: "Waiver deleted",
      driveDeleted,
    });
  } catch (error) {
    console.error("Admin delete error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
