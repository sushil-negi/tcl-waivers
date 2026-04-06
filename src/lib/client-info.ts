export interface ClientInfo {
  publicIp: string;
  userAgent: string;
  browser: string;
  os: string;
  device: string;
  screenResolution: string;
  timezone: string;
  language: string;
  platform: string;
  cookiesEnabled: boolean;
  touchSupport: boolean;
}

export async function gatherClientInfo(): Promise<ClientInfo> {
  // Fetch public IP from free API
  let publicIp = "unknown";
  try {
    const res = await fetch("https://api.ipify.org?format=json", {
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json();
    publicIp = data.ip;
  } catch {
    // Fallback
    try {
      const res = await fetch("https://ipinfo.io/json", {
        signal: AbortSignal.timeout(5000),
      });
      const data = await res.json();
      publicIp = data.ip;
    } catch {
      // Leave as unknown
    }
  }

  const ua = navigator.userAgent;

  // Parse browser
  const browserMatch = ua.match(
    /(Chrome|Firefox|Safari|Edge|Opera|MSIE|Trident)[\/\s](\d+)/i
  );
  let browser = "Unknown";
  if (browserMatch) {
    browser = `${browserMatch[1]} ${browserMatch[2]}`;
  }

  // Parse OS
  let os = "Unknown";
  if (ua.includes("Windows NT 10")) os = "Windows 10/11";
  else if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac OS X")) {
    const ver = ua.match(/Mac OS X (\d+[._]\d+)/);
    os = `macOS ${ver ? ver[1].replace("_", ".") : ""}`.trim();
  } else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("Android")) {
    const ver = ua.match(/Android (\d+)/);
    os = `Android ${ver ? ver[1] : ""}`.trim();
  } else if (ua.includes("iPhone") || ua.includes("iPad")) {
    const ver = ua.match(/OS (\d+_\d+)/);
    os = `iOS ${ver ? ver[1].replace("_", ".") : ""}`.trim();
  }

  // Device type
  let device = "Desktop";
  if (/Mobi|Android/i.test(ua)) device = "Mobile";
  else if (/Tablet|iPad/i.test(ua)) device = "Tablet";

  return {
    publicIp,
    userAgent: ua,
    browser,
    os,
    device,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    platform: navigator.platform || "Unknown",
    cookiesEnabled: navigator.cookieEnabled,
    touchSupport: "ontouchstart" in window || navigator.maxTouchPoints > 0,
  };
}
