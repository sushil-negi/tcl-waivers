import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { getTeams } from "@/lib/db";
import { uploadToAdditionalTeams } from "@/lib/google-drive";

// Verify email is verified (same check as waiver submission)
async function isEmailVerified(email: string): Promise<boolean> {
  const { rows } = await sql`
    SELECT id FROM verification_codes
    WHERE LOWER(email) = LOWER(${email}) AND verified = 1
    ORDER BY created_at DESC LIMIT 1
  `;
  return rows.length > 0;
}

export async function POST(request: NextRequest) {
  try {
    const { email, newTeams } = await request.json();

    if (!email || !newTeams || !Array.isArray(newTeams) || newTeams.length === 0) {
      return NextResponse.json(
        { error: "Email and at least one team are required" },
        { status: 400 }
      );
    }

    // Verify email identity
    if (!(await isEmailVerified(email))) {
      return NextResponse.json(
        { error: "Email has not been verified" },
        { status: 403 }
      );
    }

    // Get existing waiver
    const { rows } = await sql`
      SELECT * FROM waivers WHERE LOWER(email) = LOWER(${email})
    `;
    if (rows.length === 0) {
      return NextResponse.json(
        { error: "No waiver found for this email" },
        { status: 404 }
      );
    }

    const waiver = rows[0];
    const existingTeams = waiver.team
      ? waiver.team.split(",").map((t: string) => t.trim()).filter(Boolean)
      : [];

    // Validate new teams
    const validTeams = await getTeams();
    for (const team of newTeams) {
      if (!validTeams.includes(team)) {
        return NextResponse.json(
          { error: `Invalid team: "${team}"` },
          { status: 400 }
        );
      }
      if (existingTeams.includes(team)) {
        return NextResponse.json(
          { error: `Already registered with "${team}"` },
          { status: 409 }
        );
      }
    }

    // Update team list in DB
    const updatedTeams = [...existingTeams, ...newTeams].join(", ");
    await sql`UPDATE waivers SET team = ${updatedTeams} WHERE id = ${waiver.id}`;

    // Upload PDF to new team folders in Drive
    if (waiver.drive_file_id) {
      try {
        const fileName = `TCL_Waiver_${waiver.full_name.replace(/\s+/g, "_")}_${waiver.document_id}.pdf`;
        await uploadToAdditionalTeams(waiver.drive_file_id, fileName, newTeams);
      } catch (driveError) {
        console.error("Drive upload to new teams error:", driveError);
        // Continue — DB is already updated
      }
    }

    return NextResponse.json({
      success: true,
      teams: updatedTeams,
      message: `Successfully added to: ${newTeams.join(", ")}`,
    });
  } catch (error) {
    console.error("Add team error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
