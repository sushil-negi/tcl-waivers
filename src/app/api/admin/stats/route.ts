import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { checkAuth } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  const auth = checkAuth(request);
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: 401 });
  }

  try {
    // Total unique players (waivers)
    const total = await sql`SELECT COUNT(*) as count FROM waivers`;

    // Team breakdown — unnest comma-separated teams so multi-team players count in each team
    const teamBreakdown = await sql`
      SELECT TRIM(team_name) as team, COUNT(*) as count
      FROM waivers, unnest(string_to_array(team, ',')) as team_name
      WHERE team IS NOT NULL AND TRIM(team_name) != ''
      GROUP BY TRIM(team_name)
      ORDER BY count DESC
    `;

    // Total team-player registrations
    const totalRegistrations = await sql`
      SELECT COUNT(*) as count
      FROM waivers, unnest(string_to_array(team, ',')) as team_name
      WHERE team IS NOT NULL AND TRIM(team_name) != ''
    `;

    // Calculate dynamic threshold: average players per active team, minimum 11
    const activeTeams = teamBreakdown.rows.length;
    let threshold = 11;
    if (activeTeams > 0) {
      const totalPlayers = teamBreakdown.rows.reduce(
        (sum, r) => sum + parseInt(r.count), 0
      );
      const avg = Math.round(totalPlayers / activeTeams);
      threshold = Math.max(11, avg);
    }

    const recentSignings = await sql`
      SELECT full_name, email, team, signed_at, document_id, is_minor, cricclubs_id
      FROM waivers ORDER BY created_at DESC LIMIT 10
    `;

    // Age bracket breakdown (per unique player)
    const ageBrackets = await sql`
      SELECT
        COALESCE(SUM(CASE WHEN date_of_birth IS NOT NULL AND EXTRACT(YEAR FROM AGE(CURRENT_DATE, date_of_birth::date)) < 18 THEN 1 ELSE 0 END), 0) as under_18,
        COALESCE(SUM(CASE WHEN date_of_birth IS NOT NULL AND EXTRACT(YEAR FROM AGE(CURRENT_DATE, date_of_birth::date)) BETWEEN 18 AND 30 THEN 1 ELSE 0 END), 0) as age_18_30,
        COALESCE(SUM(CASE WHEN date_of_birth IS NOT NULL AND EXTRACT(YEAR FROM AGE(CURRENT_DATE, date_of_birth::date)) BETWEEN 31 AND 44 THEN 1 ELSE 0 END), 0) as age_31_44,
        COALESCE(SUM(CASE WHEN date_of_birth IS NOT NULL AND EXTRACT(YEAR FROM AGE(CURRENT_DATE, date_of_birth::date)) BETWEEN 45 AND 55 THEN 1 ELSE 0 END), 0) as age_45_55,
        COALESCE(SUM(CASE WHEN date_of_birth IS NOT NULL AND EXTRACT(YEAR FROM AGE(CURRENT_DATE, date_of_birth::date)) > 55 THEN 1 ELSE 0 END), 0) as above_55
      FROM waivers
    `;

    // Daily registration trend (last 14 days)
    const dailyTrend = await sql`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as count
      FROM waivers
      WHERE created_at >= NOW() - INTERVAL '14 days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    // Teams above/below dynamic threshold
    const teamsAboveThreshold = teamBreakdown.rows.filter(
      (r) => parseInt(r.count) >= threshold
    ).length;
    const teamsBelowThreshold = teamBreakdown.rows.filter(
      (r) => parseInt(r.count) < threshold
    ).length;

    const totalTeams = await sql`SELECT COUNT(*) as count FROM teams`;
    const teamsWithZero = parseInt(totalTeams.rows[0].count) - activeTeams;

    // Multi-team player count
    const multiTeamPlayers = await sql`
      SELECT COUNT(*) as count FROM waivers WHERE team LIKE '%,%'
    `;

    return NextResponse.json({
      totalWaivers: parseInt(total.rows[0].count),
      totalRegistrations: parseInt(totalRegistrations.rows[0].count),
      teamBreakdown: teamBreakdown.rows,
      recentSignings: recentSignings.rows,
      ageBrackets: [
        { bracket: "Under 18", count: parseInt(ageBrackets.rows[0].under_18) },
        { bracket: "18-30", count: parseInt(ageBrackets.rows[0].age_18_30) },
        { bracket: "31-44", count: parseInt(ageBrackets.rows[0].age_31_44) },
        { bracket: "45-55", count: parseInt(ageBrackets.rows[0].age_45_55) },
        { bracket: "55+", count: parseInt(ageBrackets.rows[0].above_55) },
      ],
      minorCount: parseInt(ageBrackets.rows[0].under_18),
      dailyTrend: dailyTrend.rows,
      threshold,
      teamReadiness: {
        aboveThreshold: teamsAboveThreshold,
        belowThreshold: teamsBelowThreshold,
        noWaivers: teamsWithZero,
      },
      totalRegisteredTeams: parseInt(totalTeams.rows[0].count),
      multiTeamPlayers: parseInt(multiTeamPlayers.rows[0].count),
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json({
      totalWaivers: 0,
      totalRegistrations: 0,
      teamBreakdown: [],
      recentSignings: [],
      ageBrackets: [],
      minorCount: 0,
      dailyTrend: [],
      threshold: 11,
      teamReadiness: { aboveThreshold: 0, belowThreshold: 0, noWaivers: 0 },
      totalRegisteredTeams: 0,
      multiTeamPlayers: 0,
    });
  }
}
