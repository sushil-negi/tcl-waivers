import { NextRequest, NextResponse } from "next/server";
import { checkEmailSigned, storeVerificationCode } from "@/lib/db";
import { sendVerificationEmail, generateVerificationCode } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, allowExisting } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    // Check if already signed (skip check if adding a team to existing waiver)
    if (!allowExisting && (await checkEmailSigned(email))) {
      return NextResponse.json(
        { error: "This email has already been used to sign a waiver." },
        { status: 409 }
      );
    }

    const code = generateVerificationCode();
    await storeVerificationCode(email, code);

    try {
      await sendVerificationEmail(email, code);
    } catch (emailError) {
      console.error("Email send error:", emailError);
      return NextResponse.json(
        { error: "Failed to send verification email. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: "Verification code sent" });
  } catch (error) {
    console.error("Send code error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
