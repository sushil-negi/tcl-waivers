import { NextRequest } from "next/server";
import { timingSafeEqual } from "crypto";

// Simple in-memory rate limiter for admin login
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export function checkAuth(request: NextRequest): { valid: boolean; error?: string } {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return { valid: false, error: "Admin password not configured" };
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return { valid: false, error: "Unauthorized" };
  }

  const token = authHeader.replace("Bearer ", "");
  const ip = getClientIp(request);

  // Rate limiting
  const now = Date.now();
  const attempts = loginAttempts.get(ip);
  if (attempts) {
    if (now - attempts.lastAttempt > WINDOW_MS) {
      loginAttempts.delete(ip);
    } else if (attempts.count >= MAX_ATTEMPTS) {
      return { valid: false, error: "Too many login attempts. Try again in 15 minutes." };
    }
  }

  // Timing-safe comparison to prevent timing attacks
  const tokenBuf = Buffer.from(token);
  const passBuf = Buffer.from(adminPassword);

  let valid = false;
  if (tokenBuf.length === passBuf.length) {
    valid = timingSafeEqual(tokenBuf, passBuf);
  }

  if (!valid) {
    const current = loginAttempts.get(ip) || { count: 0, lastAttempt: now };
    loginAttempts.set(ip, { count: current.count + 1, lastAttempt: now });
    return { valid: false, error: "Invalid password" };
  }

  // Reset attempts on success
  loginAttempts.delete(ip);
  return { valid: true };
}
