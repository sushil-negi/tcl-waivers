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
      cricclubsId,
      guardianName,
      guardianRelationship,
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

    // CricClubs Player ID validation
    if (!cricclubsId || !/^\d{6,7}$/.test(cricclubsId)) {
      return NextResponse.json(
        { error: "CricClubs Player ID must be exactly 6 or 7 digits" },
        { status: 400 }
      );
    }

    // Compute isMinor server-side
    let isMinor = false;
    if (dateOfBirth) {
      const dob = new Date(dateOfBirth);
      const age = (Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      isMinor = age < 18;
    }

    // Guardian validation for minors
    if (isMinor) {
      if (!guardianName || guardianName.trim().length < 2) {
        return NextResponse.json(
          { error: "Parent/Guardian name is required for minor participants" },
          { status: 400 }
        );
      }
      const validRelationships = ["Parent", "Mother", "Father", "Legal Guardian"];
      if (!guardianRelationship || !validRelationships.includes(guardianRelationship)) {
        return NextResponse.json(
          { error: "Valid guardian relationship is required for minor participants" },
          { status: 400 }
        );
      }
    }

    const validTeams = await getTeams();
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
    if (await checkEmailSigned(email)) {
      return NextResponse.json(
        { error: "This email has already been used to sign a waiver." },
        { status: 409 }
      );
    }

    // Check email verified
    if (!(await isEmailVerified(email))) {
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
      cricclubsId,
      isMinor,
      guardianName: isMinor ? guardianName : undefined,
      guardianRelationship: isMinor ? guardianRelationship : undefined,
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
    await saveWaiver({
      documentId,
      fullName,
      email,
      phone,
      dateOfBirth,
      emergencyContactName,
      emergencyContactPhone,
      team,
      cricclubsId,
      isMinor,
      guardianName: isMinor ? guardianName : undefined,
      guardianRelationship: isMinor ? guardianRelationship : undefined,
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
