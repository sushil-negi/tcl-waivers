import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { google } from "googleapis";
import { checkAuth } from "@/lib/admin-auth";

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
  const auth = checkAuth(request);
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: 401 });
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

    // Delete ALL copies from Google Drive if requested
    let driveDeleted = false;
    let driveFilesDeleted = 0;
    if (deleteDrive) {
      try {
        const driveAuth = getDriveAuth();
        const drive = google.drive({ version: "v3", auth: driveAuth });

        // Build the expected filename to find all copies across team folders
        const fileName = `TCL_Waiver_${waiver.full_name.replace(/\s+/g, "_")}_${waiver.document_id}.pdf`;
        const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

        // Search for all files matching this waiver's filename in the Drive folder tree
        const searchQuery = `name = '${fileName.replace(/'/g, "\\'")}' and trashed = false`;
        const searchResult = await drive.files.list({
          q: searchQuery,
          fields: "files(id, name, parents)",
          spaces: "drive",
        });

        if (searchResult.data.files && searchResult.data.files.length > 0) {
          for (const file of searchResult.data.files) {
            try {
              await drive.files.delete({ fileId: file.id! });
              driveFilesDeleted++;
            } catch {
              // Continue deleting other copies even if one fails
            }
          }
          driveDeleted = true;
        } else if (waiver.drive_file_id) {
          // Fallback: delete by stored file ID if search found nothing
          try {
            await drive.files.delete({ fileId: waiver.drive_file_id });
            driveFilesDeleted = 1;
            driveDeleted = true;
          } catch {
            // Ignore
          }
        }
      } catch (driveError) {
        console.error("Drive delete error:", driveError);
      }
    }

    // Delete verification codes for this email
    await sql`DELETE FROM verification_codes WHERE LOWER(email) = LOWER(${waiver.email})`;
    await sql`DELETE FROM waivers WHERE id = ${id}`;

    return NextResponse.json({
      success: true,
      message: `Waiver deleted${driveDeleted ? ` (${driveFilesDeleted} Drive file${driveFilesDeleted !== 1 ? "s" : ""} removed)` : ""}`,
      driveDeleted,
      driveFilesDeleted,
    });
  } catch (error) {
    console.error("Admin delete error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
