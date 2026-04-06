import { NextRequest, NextResponse } from "next/server";
import {
  checkEmailSigned,
  isEmailVerified,
  saveWaiver,
  generateDocumentId,
} from "@/lib/db";
import { generateSignedPdf } from "@/lib/pdf-generator";
import { uploadPdfToDrive } from "@/lib/google-drive";
import { getTeams } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      fullName,
      email,
      phone,
      dateOfBirth,
      emergencyContactName,
      emergencyContactPhone,
      team,
      signatureDataUrl,
      consentToElectronic,
      agreeToTerms,
      clientInfo,
    } = body;

    // Validation
    if (!fullName || !email || !signatureDataUrl) {
      return NextResponse.json(
        { error: "Name, email, and signature are required" },
        { status: 400 }
      );
    }

    const validTeams = getTeams();
    if (team && !validTeams.includes(team)) {
      return NextResponse.json(
        { error: "Invalid team selection" },
        { status: 400 }
      );
    }

    if (!consentToElectronic || !agreeToTerms) {
      return NextResponse.json(
        { error: "You must agree to the terms and consent to electronic signing" },
        { status: 400 }
      );
    }

    // Check duplicate
    if (checkEmailSigned(email)) {
      return NextResponse.json(
        { error: "This email has already been used to sign a waiver." },
        { status: 409 }
      );
    }

    // Check email verified
    if (!isEmailVerified(email)) {
      return NextResponse.json(
        { error: "Email has not been verified. Please verify your email first." },
        { status: 403 }
      );
    }

    // Get IP address — prefer client-reported public IP, fall back to headers
    const ipAddress = clientInfo?.publicIp ||
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const userAgent = request.headers.get("user-agent") || "unknown";
    const documentId = generateDocumentId();
    const now = new Date();
    const signedAt = now.toLocaleString("en-US", {
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    const signedAtUtc = now.toISOString();

    // Generate PDF
    const { pdfBytes, pdfHash } = await generateSignedPdf({
      documentId,
      fullName,
      email,
      phone,
      dateOfBirth,
      emergencyContactName,
      emergencyContactPhone,
      team,
      ipAddress,
      signedAt,
      signedAtUtc,
      signatureDataUrl,
      clientInfo,
    });

    // Upload to Google Drive
    let driveFileId: string | undefined;
    let driveFileUrl: string | undefined;

    try {
      const fileName = `TCL_Waiver_${fullName.replace(/\s+/g, "_")}_${documentId}.pdf`;
      const driveResult = await uploadPdfToDrive(pdfBytes, fileName, team);
      driveFileId = driveResult.fileId;
      driveFileUrl = driveResult.fileUrl;
    } catch (driveError) {
      console.error("Google Drive upload error:", driveError);
      // Continue even if Drive upload fails — save record locally
    }

    // Save to database
    saveWaiver({
      documentId,
      fullName,
      email,
      phone,
      dateOfBirth,
      emergencyContactName,
      emergencyContactPhone,
      team,
      ipAddress,
      userAgent,
      signedAt,
      signedAtUtc,
      pdfHash,
      driveFileId,
      driveFileUrl,
    });

    return NextResponse.json({
      success: true,
      documentId,
      driveFileUrl,
      message: "Waiver signed successfully",
    });
  } catch (error) {
    console.error("Submit waiver error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
