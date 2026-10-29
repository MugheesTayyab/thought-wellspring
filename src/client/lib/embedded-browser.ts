export const BROWSER_SIGNIN_URL = "https://bajihears.app/corner";

export function embeddedAuthBrowserName(userAgent: string): string | null {
  if (/Instagram/i.test(userAgent)) return "Instagram";
  if (/FBAN|FBAV|FB_IAB/i.test(userAgent)) return "Facebook";
  if (/;\s*wv\)/i.test(userAgent)) return "this app";
  return null;
}
