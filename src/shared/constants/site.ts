export const SITE_HOST = "bajihears.app";
export const SITE_URL = `https://${SITE_HOST}`;

export const SUPPORT_EMAIL = "support@bajihears.app";
export const PRIVACY_EMAIL = "privacy@bajihears.app";

// Shown on About and Contact when set. Left null until the owner chooses the
// name (person or business) to publish; the pages read correctly without it.
export const OPERATOR_NAME: string | null = null;

export const ADSENSE = {
  client: "ca-pub-3506843405786818",
  // Stays false until AdSense approves the site. Turning it on widens the CSP
  // to Google's ad hosts and lets <AdSlot /> render, so flip it only after the
  // consent message and Privacy Policy status below are ready.
  adsEnabled: false,
  // Display ad unit id created in AdSense after approval.
  guideSlot: "",
} as const;
