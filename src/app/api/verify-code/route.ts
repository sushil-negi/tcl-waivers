import { NextRequest, NextResponse } from "next/server";
import { verifyCode } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json(
        { error: "Email and code are required" },
        { status: 400 }
      );
    }

    if (typeof code !== "string" || code.length !== 6 || !/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: "Code must be a 6-digit number" },
        { status: 400 }
      );
    }

    const result = await verifyCode(email, code);

    if (!result.valid) {
      return NextResponse.json({ error: result.reason }, { status: 400 });
    }

    return NextResponse.json({ success: true, verified: true });
  } catch (error) {
    console.error("Verify code error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
