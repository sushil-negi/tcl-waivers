import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { checkAuth } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  const auth = checkAuth(request);
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const report = searchParams.get("type");

  try {
    switch (report) {
      case "roster": {
        // Team roster completion — all teams with player count vs 15 threshold
        const { rows: allTeams } = await sql`SELECT name FROM teams ORDER BY name ASC`;
        const { rows: teamCounts } = await sql`
          SELECT team, COUNT(*) as count FROM waivers
          WHERE team IS NOT NULL GROUP BY team
        `;

        // Build a map of counts including multi-team (comma-separated)
        const countMap: Record<string, number> = {};
        for (const row of teamCounts) {
          const teams = row.team.split(",").map((t: string) => t.trim());
          for (const t of teams) {
            countMap[t] = (countMap[t] || 0) + parseInt(row.count);
          }
        }

        // Dynamic threshold: average of active teams, minimum 11
        const activeCounts = Object.values(countMap).filter((c) => c > 0);
        const avg = activeCounts.length > 0
          ? Math.round(activeCounts.reduce((a, b) => a + b, 0) / activeCounts.length)
          : 11;
        const threshold = Math.max(11, avg);

        const roster = allTeams.map((t) => ({
          team: t.name,
          count: countMap[t.name] || 0,
          needed: Math.max(0, threshold - (countMap[t.name] || 0)),
          ready: (countMap[t.name] || 0) >= threshold,
        }));

        return NextResponse.json({ roster, threshold });
      }

      case "emergency": {
        // Emergency contacts grouped by team
        const { rows } = await sql`
          SELECT full_name, team, phone, emergency_contact_name, emergency_contact_phone
          FROM waivers ORDER BY team ASC, full_name ASC
        `;
        return NextResponse.json({ contacts: rows });
      }

      case "minors": {
        // All minor players with guardian info
        const { rows } = await sql`
          SELECT full_name, email, team, date_of_birth, guardian_name, guardian_relationship, phone
          FROM waivers WHERE is_minor = true ORDER BY team ASC, full_name ASC
        `;
        return NextResponse.json({ minors: rows });
      }

      case "cricclubs": {
        // CricClubs ID validation — find missing/duplicate IDs
        const { rows: all } = await sql`
          SELECT full_name, email, team, cricclubs_id FROM waivers ORDER BY team ASC
        `;
        const { rows: duplicates } = await sql`
          SELECT cricclubs_id, COUNT(*) as count
          FROM waivers
          WHERE cricclubs_id IS NOT NULL AND cricclubs_id != ''
          GROUP BY cricclubs_id
          HAVING COUNT(*) > 1
        `;
        const missing = all.filter((r) => !r.cricclubs_id);
        return NextResponse.json({
          total: all.length,
          missing,
          duplicates: duplicates,
          duplicateIds: duplicates.map((d) => d.cricclubs_id),
        });
      }

      case "multi-team": {
        // Players registered on multiple teams
        const { rows } = await sql`
          SELECT full_name, email, team, phone
          FROM waivers WHERE team LIKE '%,%' ORDER BY full_name ASC
        `;
        return NextResponse.json({ players: rows });
      }

      default:
        return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
    }
  } catch (error) {
    console.error("Report error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
