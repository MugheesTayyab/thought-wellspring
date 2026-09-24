// Phase 7: Web Push notifications via VAPID. Placeholder for Phase 1.
export const VAPID_CONFIG = {
  publicKey: process.env.VAPID_PUBLIC_KEY || "",
  privateKey: process.env.VAPID_PRIVATE_KEY || "",
  subject: process.env.VAPID_SUBJECT || "mailto:support@bajihears.com",
};
