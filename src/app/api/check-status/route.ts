import { NextRequest, NextResponse } from "next/server";
import { checkEmailSigned } from "@/lib/db";

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

    const alreadySigned = await checkEmailSigned(email);

    return NextResponse.json({ alreadySigned });
  } catch (error) {
    console.error("Check status error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
