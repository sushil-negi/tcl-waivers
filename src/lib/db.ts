import { sql } from "@vercel/postgres";
import crypto from "crypto";

// Use global to persist across hot-reloads in dev
const globalForDb = globalThis as unknown as { dbInitialized?: boolean };

async function initSchema() {
  if (globalForDb.dbInitialized) return;

  await sql`
    CREATE TABLE IF NOT EXISTS waivers (
      id SERIAL PRIMARY KEY,
      document_id TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      date_of_birth TEXT,
      emergency_contact_name TEXT,
      emergency_contact_phone TEXT,
      team TEXT,
      ip_address TEXT NOT NULL,
      user_agent TEXT,
      signed_at TEXT NOT NULL,
      signed_at_utc TEXT NOT NULL,
      pdf_hash TEXT NOT NULL,
      drive_file_id TEXT,
      drive_file_url TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS verification_codes (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL,
      code TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      verified INTEGER DEFAULT 0,
      attempts INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS teams (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_waivers_email ON waivers(email)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_verification_email ON verification_codes(email)`;

  // Schema migrations — add new columns to existing tables
  await sql`ALTER TABLE waivers ADD COLUMN IF NOT EXISTS is_minor BOOLEAN DEFAULT FALSE`;
  await sql`ALTER TABLE waivers ADD COLUMN IF NOT EXISTS guardian_name TEXT`;
  await sql`ALTER TABLE waivers ADD COLUMN IF NOT EXISTS guardian_relationship TEXT`;
  await sql`ALTER TABLE waivers ADD COLUMN IF NOT EXISTS cricclubs_id TEXT`;

  // Seed default teams if table is empty
  const { rows } = await sql`SELECT COUNT(*) as c FROM teams`;
  if (parseInt(rows[0].c) === 0) {
    const { DEFAULT_TEAMS } = require("./teams");
    for (const team of DEFAULT_TEAMS) {
      await sql`INSERT INTO teams (name) VALUES (${team}) ON CONFLICT (name) DO NOTHING`;
    }
  }

  globalForDb.dbInitialized = true;
}

export async function checkEmailSigned(email: string): Promise<boolean> {
  await initSchema();
  const { rows } = await sql`SELECT id FROM waivers WHERE LOWER(email) = LOWER(${email})`;
  return rows.length > 0;
}

export async function storeVerificationCode(email: string, code: string): Promise<void> {
  await initSchema();
  await sql`DELETE FROM verification_codes WHERE LOWER(email) = LOWER(${email})`;

  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  await sql`
    INSERT INTO verification_codes (email, code, expires_at)
    VALUES (${email.toLowerCase()}, ${code}, ${expiresAt})
  `;
}

export async function verifyCode(
  email: string,
  code: string
): Promise<{ valid: boolean; reason?: string }> {
  await initSchema();

  const { rows } = await sql`
    SELECT * FROM verification_codes
    WHERE LOWER(email) = LOWER(${email}) AND verified = 0
    ORDER BY created_at DESC LIMIT 1
  `;

  if (rows.length === 0) {
    return { valid: false, reason: "No verification code found. Please request a new one." };
  }

  const row = rows[0];

  if (row.attempts >= 5) {
    return { valid: false, reason: "Too many attempts. Please request a new code." };
  }

  await sql`UPDATE verification_codes SET attempts = attempts + 1 WHERE id = ${row.id}`;

  if (new Date(row.expires_at) < new Date()) {
    return { valid: false, reason: "Code expired. Please request a new one." };
  }

  if (row.code !== code) {
    return { valid: false, reason: `Invalid code. ${4 - row.attempts} attempts remaining.` };
  }

  await sql`UPDATE verification_codes SET verified = 1 WHERE id = ${row.id}`;
  return { valid: true };
}

export async function isEmailVerified(email: string): Promise<boolean> {
  await initSchema();
  const { rows } = await sql`
    SELECT id FROM verification_codes
    WHERE LOWER(email) = LOWER(${email}) AND verified = 1
    ORDER BY created_at DESC LIMIT 1
  `;
  return rows.length > 0;
}

export async function saveWaiver(data: {
  documentId: string;
  fullName: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  team?: string;
  cricclubsId?: string;
  isMinor?: boolean;
  guardianName?: string;
  guardianRelationship?: string;
  ipAddress: string;
  userAgent?: string;
  signedAt: string;
  signedAtUtc: string;
  pdfHash: string;
  driveFileId?: string;
  driveFileUrl?: string;
}): Promise<void> {
  await initSchema();
  await sql`
    INSERT INTO waivers (
      document_id, full_name, email, phone, date_of_birth,
      emergency_contact_name, emergency_contact_phone, team,
      cricclubs_id, is_minor, guardian_name, guardian_relationship,
      ip_address, user_agent, signed_at, signed_at_utc,
      pdf_hash, drive_file_id, drive_file_url
    ) VALUES (
      ${data.documentId}, ${data.fullName}, ${data.email.toLowerCase()},
      ${data.phone || null}, ${data.dateOfBirth || null},
      ${data.emergencyContactName || null}, ${data.emergencyContactPhone || null},
      ${data.team || null}, ${data.cricclubsId || null},
      ${data.isMinor || false}, ${data.guardianName || null},
      ${data.guardianRelationship || null},
      ${data.ipAddress}, ${data.userAgent || null},
      ${data.signedAt}, ${data.signedAtUtc}, ${data.pdfHash},
      ${data.driveFileId || null}, ${data.driveFileUrl || null}
    )
  `;
}

// === TEAM MANAGEMENT ===

export async function getTeams(): Promise<string[]> {
  await initSchema();
  const { rows } = await sql`SELECT name FROM teams ORDER BY name ASC`;
  return rows.map((r) => r.name);
}

export async function addTeam(name: string): Promise<{ success: boolean; error?: string }> {
  await initSchema();
  try {
    await sql`INSERT INTO teams (name) VALUES (${name.trim()})`;
    return { success: true };
  } catch (err: any) {
    if (err.code === "23505") {
      return { success: false, error: "Team already exists" };
    }
    return { success: false, error: "Failed to add team" };
  }
}

export async function removeTeam(name: string): Promise<{ success: boolean; error?: string }> {
  await initSchema();
  const { rows } = await sql`SELECT id FROM waivers WHERE team = ${name} LIMIT 1`;
  if (rows.length > 0) {
    return {
      success: false,
      error: "Cannot remove team — signed waivers exist for this team",
    };
  }
  await sql`DELETE FROM teams WHERE name = ${name}`;
  return { success: true };
}

export function generateDocumentId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `TCL-${timestamp}-${random}`;
}
