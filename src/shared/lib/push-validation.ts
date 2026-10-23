/** Only established push providers may receive server-side outbound requests. */
export function validatePushEndpoint(endpoint: string): URL {
  const url = new URL(endpoint);
  const host = url.hostname.toLowerCase();
  const trusted =
    host === "fcm.googleapis.com" ||
    host === "updates.push.services.mozilla.com" ||
    host === "web.push.apple.com" ||
    host.endsWith(".notify.windows.com");
  if (url.protocol !== "https:" || url.port || url.username || url.password || !trusted) {
    throw new Error("Invalid push subscription endpoint.");
  }
  return url;
}
