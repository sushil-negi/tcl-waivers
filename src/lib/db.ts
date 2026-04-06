import Database from "better-sqlite3";
import path from "path";
import crypto from "crypto";

const DB_PATH = path.join(process.cwd(), "data", "waivers.db");

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    const fs = require("fs");
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initSchema(db);
  }
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS waivers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS verification_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      code TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      verified INTEGER DEFAULT 0,
      attempts INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_waivers_email ON waivers(email);
    CREATE INDEX IF NOT EXISTS idx_verification_email ON verification_codes(email);
  `);

  // Seed default teams if table is empty
  const count = db.prepare("SELECT COUNT(*) as c FROM teams").get() as any;
  if (count.c === 0) {
    const { DEFAULT_TEAMS } = require("./teams");
    const insert = db.prepare("INSERT OR IGNORE INTO teams (name) VALUES (?)");
    for (const team of DEFAULT_TEAMS) {
      insert.run(team);
    }
  }
}

export function checkEmailSigned(email: string): boolean {
  const row = getDb()
    .prepare("SELECT id FROM waivers WHERE LOWER(email) = LOWER(?)")
    .get(email);
  return !!row;
}

export function storeVerificationCode(email: string, code: string): void {
  const db = getDb();
  // Invalidate previous codes for this email
  db.prepare(
    "DELETE FROM verification_codes WHERE LOWER(email) = LOWER(?)"
  ).run(email);

  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  db.prepare(
    "INSERT INTO verification_codes (email, code, expires_at) VALUES (?, ?, ?)"
  ).run(email.toLowerCase(), code, expiresAt);
}

export function verifyCode(
  email: string,
  code: string
): { valid: boolean; reason?: string } {
  const db = getDb();
  const row = db
    .prepare(
      "SELECT * FROM verification_codes WHERE LOWER(email) = LOWER(?) AND verified = 0 ORDER BY created_at DESC LIMIT 1"
    )
    .get(email) as any;

  if (!row) return { valid: false, reason: "No verification code found. Please request a new one." };

  if (row.attempts >= 5) {
    return { valid: false, reason: "Too many attempts. Please request a new code." };
  }

  // Increment attempts
  db.prepare("UPDATE verification_codes SET attempts = attempts + 1 WHERE id = ?").run(row.id);

  if (new Date(row.expires_at) < new Date()) {
    return { valid: false, reason: "Code expired. Please request a new one." };
  }

  if (row.code !== code) {
    return { valid: false, reason: `Invalid code. ${4 - row.attempts} attempts remaining.` };
  }

  // Mark as verified
  db.prepare("UPDATE verification_codes SET verified = 1 WHERE id = ?").run(row.id);
  return { valid: true };
}

export function isEmailVerified(email: string): boolean {
  const row = getDb()
    .prepare(
      "SELECT id FROM verification_codes WHERE LOWER(email) = LOWER(?) AND verified = 1 ORDER BY created_at DESC LIMIT 1"
    )
    .get(email);
  return !!row;
}

export function saveWaiver(data: {
  documentId: string;
  fullName: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  team?: string;
  ipAddress: string;
  userAgent?: string;
  signedAt: string;
  signedAtUtc: string;
  pdfHash: string;
  driveFileId?: string;
  driveFileUrl?: string;
}): void {
  getDb()
    .prepare(
      `INSERT INTO waivers (
        document_id, full_name, email, phone, date_of_birth,
        emergency_contact_name, emergency_contact_phone, team,
        ip_address, user_agent, signed_at, signed_at_utc,
        pdf_hash, drive_file_id, drive_file_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      data.documentId,
      data.fullName,
      data.email.toLowerCase(),
      data.phone || null,
      data.dateOfBirth || null,
      data.emergencyContactName || null,
      data.emergencyContactPhone || null,
      data.team || null,
      data.ipAddress,
      data.userAgent || null,
      data.signedAt,
      data.signedAtUtc,
      data.pdfHash,
      data.driveFileId || null,
      data.driveFileUrl || null
    );
}

// === TEAM MANAGEMENT ===

export function getTeams(): string[] {
  const rows = getDb()
    .prepare("SELECT name FROM teams ORDER BY name ASC")
    .all() as { name: string }[];
  return rows.map((r) => r.name);
}

export function addTeam(name: string): { success: boolean; error?: string } {
  try {
    getDb().prepare("INSERT INTO teams (name) VALUES (?)").run(name.trim());
    return { success: true };
  } catch (err: any) {
    if (err.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return { success: false, error: "Team already exists" };
    }
    return { success: false, error: "Failed to add team" };
  }
}

export function removeTeam(name: string): { success: boolean; error?: string } {
  // Check if any waivers exist for this team
  const waiver = getDb()
    .prepare("SELECT id FROM waivers WHERE team = ? LIMIT 1")
    .get(name);
  if (waiver) {
    return {
      success: false,
      error: "Cannot remove team — signed waivers exist for this team",
    };
  }
  getDb().prepare("DELETE FROM teams WHERE name = ?").run(name);
  return { success: true };
}

export function generateDocumentId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `TCL-${timestamp}-${random}`;
}
