import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { getWaiverText } from "./waiver-template";

interface WaiverData {
  documentId: string;
  fullName: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  team?: string;
  ipAddress: string;
  signedAt: string;
  signedAtUtc: string;
  signatureDataUrl: string; // base64 PNG data URL
  clientInfo?: {
    publicIp?: string;
    browser?: string;
    os?: string;
    device?: string;
    screenResolution?: string;
    timezone?: string;
    language?: string;
    platform?: string;
  };
}

// Sanitize text for WinAnsi encoding (Helvetica font)
function sanitize(text: string): string {
  let result = "";
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    const ch = text[i];
    if (ch === "\u2018" || ch === "\u2019") result += "'";
    else if (ch === "\u201C" || ch === "\u201D") result += '"';
    else if (ch === "\u2014") result += "--";
    else if (ch === "\u2013") result += "-";
    else if (ch === "\u2026") result += "...";
    else if (ch === "\u2022") result += "-";
    else if (code <= 255) result += ch;
    // Skip any character > 255 (not WinAnsi encodable)
  }
  return result;
}

export async function generateSignedPdf(
  data: WaiverData
): Promise<{ pdfBytes: Uint8Array; pdfHash: string }> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Embed TCL logo
  const logoPath = path.join(process.cwd(), "public", "tcl.jpg");
  const logoBytes = fs.readFileSync(logoPath);
  const logoImage = await pdfDoc.embedJpg(logoBytes);
  const logoAspect = logoImage.width / logoImage.height;
  const fontSize = 10;
  const lineHeight = 14;
  const margin = 50;
  const pageWidth = 612; // Letter size
  const pageHeight = 792;
  const contentWidth = pageWidth - margin * 2;

  // Helper to add pages and draw wrapped text
  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let yPos = pageHeight - margin;

  function ensureSpace(needed: number) {
    if (yPos - needed < margin) {
      currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      yPos = pageHeight - margin;
    }
  }

  function drawText(
    rawText: string,
    options: {
      size?: number;
      bold?: boolean;
      color?: [number, number, number];
      indent?: number;
    } = {}
  ) {
    // Split on newlines and draw each line separately
    const lines = sanitize(rawText).split("\n");
    for (const singleLine of lines) {
      const trimmed = singleLine.trim();
      if (!trimmed) continue;
      drawSingleLine(trimmed, options);
    }
  }

  function drawSingleLine(
    text: string,
    options: {
      size?: number;
      bold?: boolean;
      color?: [number, number, number];
      indent?: number;
    } = {}
  ) {
    const f = options.bold ? fontBold : font;
    const s = options.size || fontSize;
    const lh = s + 4;
    const indent = options.indent || 0;
    const color = options.color || [0, 0, 0];
    const maxWidth = contentWidth - indent;

    const words = text.split(" ");
    let line = "";

    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word;
      const testWidth = f.widthOfTextAtSize(testLine, s);

      if (testWidth > maxWidth && line) {
        ensureSpace(lh);
        currentPage.drawText(line, {
          x: margin + indent,
          y: yPos,
          size: s,
          font: f,
          color: rgb(color[0], color[1], color[2]),
        });
        yPos -= lh;
        line = word;
      } else {
        line = testLine;
      }
    }

    if (line) {
      ensureSpace(lh);
      currentPage.drawText(line, {
        x: margin + indent,
        y: yPos,
        size: s,
        font: f,
        color: rgb(color[0], color[1], color[2]),
      });
      yPos -= lh;
    }
  }

  function drawLine() {
    ensureSpace(10);
    currentPage.drawLine({
      start: { x: margin, y: yPos },
      end: { x: pageWidth - margin, y: yPos },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.7),
    });
    yPos -= 10;
  }

  // === HEADER WITH LOGO ===
  const logoHeaderHeight = 48;
  const logoHeaderWidth = logoHeaderHeight * logoAspect;
  currentPage.drawImage(logoImage, {
    x: margin,
    y: yPos - logoHeaderHeight + 14,
    width: logoHeaderWidth,
    height: logoHeaderHeight,
  });

  // Title text next to logo
  const titleX = margin + logoHeaderWidth + 12;
  currentPage.drawText("TENNIS CRICKET LEAGUE", {
    x: titleX,
    y: yPos,
    size: 18,
    font: fontBold,
    color: rgb(0.1, 0.34, 0.2),
  });
  currentPage.drawText("Player Registration & Liability Waiver", {
    x: titleX,
    y: yPos - 20,
    size: 12,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  yPos -= logoHeaderHeight + 4;
  drawLine();
  yPos -= 4;

  // === PLAYER INFO ===
  drawText("PARTICIPANT INFORMATION", { size: 11, bold: true, color: [0.1, 0.34, 0.2] });
  yPos -= 4;
  drawText(`Full Name: ${data.fullName}`);
  drawText(`Email: ${data.email}`);
  if (data.phone) drawText(`Phone: ${data.phone}`);
  if (data.dateOfBirth) drawText(`Date of Birth: ${data.dateOfBirth}`);
  if (data.team) drawText(`Team: ${data.team}`);
  if (data.emergencyContactName) {
    drawText(`Emergency Contact: ${data.emergencyContactName}`);
  }
  if (data.emergencyContactPhone) {
    drawText(`Emergency Contact Phone: ${data.emergencyContactPhone}`);
  }
  yPos -= 8;
  drawLine();
  yPos -= 4;

  // === WAIVER TEXT ===
  drawText("WAIVER, RELEASE & ASSUMPTION OF RISK", {
    size: 11,
    bold: true,
    color: [0.1, 0.34, 0.2],
  });
  yPos -= 4;

  const waiverText = getWaiverText(data.fullName);
  const paragraphs = waiverText.split("\n\n");

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("##")) {
      yPos -= 6;
      drawText(trimmed.replace("## ", ""), { size: 10, bold: true });
      yPos -= 2;
    } else {
      drawText(trimmed);
      yPos -= 4;
    }
  }

  yPos -= 8;
  drawLine();
  yPos -= 4;

  // === SIGNATURE SECTION ===
  drawText("ELECTRONIC SIGNATURE", { size: 11, bold: true, color: [0.1, 0.34, 0.2] });
  yPos -= 8;

  // Embed signature image
  const signatureBase64 = data.signatureDataUrl.replace(
    /^data:image\/png;base64,/,
    ""
  );
  const signatureBytes = Buffer.from(signatureBase64, "base64");
  const signatureImage = await pdfDoc.embedPng(signatureBytes);

  const sigAspect = signatureImage.width / signatureImage.height;
  const sigDisplayHeight = 50;
  const sigDisplayWidth = sigDisplayHeight * sigAspect;

  ensureSpace(sigDisplayHeight + 80);

  // Signature label
  drawText("Signature:", { bold: true });
  yPos -= 4;

  // Draw signature image
  currentPage.drawImage(signatureImage, {
    x: margin,
    y: yPos - sigDisplayHeight,
    width: Math.min(sigDisplayWidth, 200),
    height: sigDisplayHeight,
  });
  yPos -= sigDisplayHeight + 8;

  drawLine();
  yPos -= 4;

  // === AUDIT TRAIL ===
  drawText("SIGNING DETAILS & AUDIT TRAIL", {
    size: 11,
    bold: true,
    color: [0.1, 0.34, 0.2],
  });
  yPos -= 4;
  drawText(`Document ID: ${data.documentId}`);
  drawText(`Signed At (Local): ${data.signedAt}`);
  drawText(`Signed At (UTC): ${data.signedAtUtc}`);
  drawText(`IP Address: ${data.ipAddress}`);
  drawText(`Email Verified: Yes`);
  drawText(`Signing Method: Electronic signature via web application`);

  if (data.clientInfo) {
    yPos -= 4;
    drawText("DEVICE & PLATFORM INFORMATION", {
      size: 10,
      bold: true,
      color: [0.1, 0.34, 0.2],
    });
    yPos -= 2;
    if (data.clientInfo.browser) drawText(`Browser: ${data.clientInfo.browser}`);
    if (data.clientInfo.os) drawText(`Operating System: ${data.clientInfo.os}`);
    if (data.clientInfo.device) drawText(`Device Type: ${data.clientInfo.device}`);
    if (data.clientInfo.platform) drawText(`Platform: ${data.clientInfo.platform}`);
    if (data.clientInfo.screenResolution) drawText(`Screen Resolution: ${data.clientInfo.screenResolution}`);
    if (data.clientInfo.timezone) drawText(`Timezone: ${data.clientInfo.timezone}`);
    if (data.clientInfo.language) drawText(`Language: ${data.clientInfo.language}`);
  }

  yPos -= 8;

  // Legal notice
  drawText(
    "This document was electronically signed in compliance with the U.S. Electronic Signatures in Global and National Commerce (ESIGN) Act and the Uniform Electronic Transactions Act (UETA). The signer's identity was verified via email verification. The signature, timestamp, IP address, and device information are recorded as part of the audit trail.",
    { size: 8, color: [0.5, 0.5, 0.5] }
  );

  // === ADD WATERMARK TO ALL PAGES ===
  const watermarkSize = 200;
  const watermarkWidth = watermarkSize * logoAspect;
  const pages = pdfDoc.getPages();
  for (const page of pages) {
    const { width, height } = page.getSize();
    page.drawImage(logoImage, {
      x: (width - watermarkWidth) / 2,
      y: (height - watermarkSize) / 2,
      width: watermarkWidth,
      height: watermarkSize,
      opacity: 0.06,
    });
  }

  // Generate PDF bytes
  const pdfBytes = await pdfDoc.save();

  // Calculate SHA-256 hash
  const pdfHash = crypto.createHash("sha256").update(pdfBytes).digest("hex");

  return { pdfBytes, pdfHash };
}
