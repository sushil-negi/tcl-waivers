# TCL Waiver - Tennis Cricket League

Online waiver signing application for the Tennis Cricket League. Players register, verify their email, review a liability waiver, and sign electronically. Signed PDFs are stored in Google Drive organized by team.

## Features

- **Multi-step waiver flow** - Player info, email verification (6-digit OTP), waiver review, electronic signature
- **Legally binding** - ESIGN Act & UETA compliant with consent checkboxes, audit trail, IP logging, and device fingerprinting
- **Google Drive storage** - Signed PDFs auto-uploaded to team-specific folders
- **Duplicate prevention** - One waiver per verified email address
- **Team management** - Admin can add/remove teams; players select from an autocomplete list
- **Admin panel** (`/admin`) - Dashboard with charts, waiver management, team CRUD, search/filter
- **PDF audit trail** - Document ID, timestamp, IP address, browser, OS, device type, screen resolution, timezone

## Tech Stack

- **Next.js 16** (App Router) + React + Tailwind CSS
- **SQLite** (better-sqlite3) - local file DB, zero setup
- **pdf-lib** - PDF generation with embedded signatures
- **Gmail API** (OAuth2) - verification emails
- **Google Drive API** (OAuth2) - PDF storage
- **Recharts** - admin dashboard charts
- **signature_pad** - canvas-based signature capture

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your credentials (see [Setup Guide](#setup-guide) below).

### 3. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the waiver form and [http://localhost:3000/admin](http://localhost:3000/admin) for the admin panel.

## Setup Guide

### Google Cloud Project

1. Go to [console.cloud.google.com](https://console.cloud.google.com) and create a project
2. Enable **Gmail API** and **Google Drive API**
3. Create **OAuth consent screen** (Internal for Workspace)
4. Create **OAuth client ID** (Web application)
   - Add `https://developers.google.com/oauthplayground` to Authorized redirect URIs

### OAuth2 Refresh Token

1. Go to [OAuth Playground](https://developers.google.com/oauthplayground)
2. Click gear icon, check "Use your own OAuth credentials", enter Client ID + Secret
3. Select scopes: `Gmail API v1 > gmail.send` and `Drive API v3 > drive.file`
4. Authorize and exchange for tokens
5. Copy the refresh token to `.env.local`

### Google Drive Folder

1. Create a folder in Google Drive for storing signed waivers
2. Copy the folder ID from the URL and add to `.env.local`

### Admin Password

Set `ADMIN_PASSWORD` in `.env.local`. Access the admin panel at `/admin`.

## Project Structure

```
src/
  app/
    page.tsx                    # Main waiver signing flow (4-step wizard)
    admin/page.tsx              # Admin panel (dashboard, waivers, teams)
    api/
      check-status/route.ts     # Check if email already signed
      send-code/route.ts        # Send email verification OTP
      verify-code/route.ts      # Verify OTP code
      submit-waiver/route.ts    # Generate PDF, upload to Drive, save record
      teams/route.ts            # Public teams list for form autocomplete
      admin/
        stats/route.ts          # Dashboard statistics
        waivers/route.ts        # List waivers (with search/filter)
        waivers/[id]/route.ts   # Delete a waiver
        teams/route.ts          # Add/remove teams
  lib/
    db.ts                       # SQLite schema, queries, team management
    email.ts                    # Gmail API OAuth2 email sending
    google-drive.ts             # Drive API OAuth2 upload (team folders)
    pdf-generator.ts            # PDF generation with signature + audit trail
    waiver-template.ts          # Waiver legal text (customizable)
    teams.ts                    # Default team seed list
    client-info.ts              # Client-side device/IP fingerprinting
  components/
    WaiverForm.tsx              # Player info form with team autocomplete
    VerificationInput.tsx       # 6-digit OTP input
    WaiverPreview.tsx           # Scrollable waiver text preview
    SignaturePad.tsx             # Canvas signature capture
public/
    tcl-logo.png                # TCL logo (transparent)
    tcl.jpg                     # TCL logo (original)
data/
    waivers.db                  # SQLite database (auto-created, gitignored)
```

## Customization

### Waiver Text
Edit `src/lib/waiver-template.ts` to change the waiver content. Use `{PARTICIPANT_NAME}` as a placeholder.

### Teams
Manage teams via the admin panel (`/admin` > Teams tab). Default teams are seeded on first run from `src/lib/teams.ts`.

### Branding
- Logo: Replace `public/tcl-logo.png` and `public/tcl.jpg`
- Colors: Update Tailwind classes in `src/app/page.tsx` (header uses `#1E2533`, accents use `orange-500/600`)
