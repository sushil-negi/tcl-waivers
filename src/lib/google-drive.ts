import { google } from "googleapis";
import { Readable } from "stream";

function getDriveAuth() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });

  return oauth2Client;
}

// Find or create a team subfolder inside the main waivers folder
async function getTeamFolderId(
  drive: ReturnType<typeof google.drive>,
  parentFolderId: string,
  teamName: string
): Promise<string> {
  // Search for existing folder
  const query = `name = '${teamName.replace(/'/g, "\\'")}' and '${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const searchResult = await drive.files.list({
    q: query,
    fields: "files(id, name)",
    spaces: "drive",
  });

  if (searchResult.data.files && searchResult.data.files.length > 0) {
    return searchResult.data.files[0].id!;
  }

  // Create new folder
  const folderResult = await drive.files.create({
    requestBody: {
      name: teamName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentFolderId],
    },
    fields: "id",
  });

  return folderResult.data.id!;
}

export async function uploadPdfToDrive(
  pdfBytes: Uint8Array,
  fileName: string,
  teamNames?: string // comma-separated team names
): Promise<{ fileId: string; fileUrl: string }> {
  const auth = getDriveAuth();
  const drive = google.drive({ version: "v3", auth });

  const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!rootFolderId) {
    throw new Error("GOOGLE_DRIVE_FOLDER_ID environment variable is not set");
  }

  const teams = teamNames
    ? teamNames.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  let primaryFileId = "";
  let primaryFileUrl = "";

  if (teams.length === 0) {
    // No team — upload to root folder
    const result = await uploadToFolder(drive, pdfBytes, fileName, rootFolderId);
    primaryFileId = result.fileId;
    primaryFileUrl = result.fileUrl;
  } else {
    // Upload to each team's folder
    for (let i = 0; i < teams.length; i++) {
      const folderId = await getTeamFolderId(drive, rootFolderId, teams[i]);
      const result = await uploadToFolder(drive, pdfBytes, fileName, folderId);
      if (i === 0) {
        primaryFileId = result.fileId;
        primaryFileUrl = result.fileUrl;
      }
    }
  }

  return { fileId: primaryFileId, fileUrl: primaryFileUrl };
}

async function uploadToFolder(
  drive: ReturnType<typeof google.drive>,
  pdfBytes: Uint8Array,
  fileName: string,
  folderId: string
): Promise<{ fileId: string; fileUrl: string }> {
  const readable = new Readable();
  readable.push(Buffer.from(pdfBytes));
  readable.push(null);

  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      mimeType: "application/pdf",
      parents: [folderId],
    },
    media: {
      mimeType: "application/pdf",
      body: readable,
    },
    fields: "id, webViewLink",
  });

  const fileId = response.data.id!;
  const fileUrl = response.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;
  return { fileId, fileUrl };
}

// Upload an existing PDF to additional team folders (for add-team flow)
export async function uploadToAdditionalTeams(
  driveFileId: string,
  fileName: string,
  newTeams: string[]
): Promise<void> {
  const auth = getDriveAuth();
  const drive = google.drive({ version: "v3", auth });

  const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!rootFolderId) return;

  // Download the existing file content
  const fileContent = await drive.files.get(
    { fileId: driveFileId, alt: "media" },
    { responseType: "arraybuffer" }
  );

  const pdfBytes = new Uint8Array(fileContent.data as ArrayBuffer);

  for (const team of newTeams) {
    const folderId = await getTeamFolderId(drive, rootFolderId, team);
    await uploadToFolder(drive, pdfBytes, fileName, folderId);
  }
}
