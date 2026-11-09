const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export const CAPTCHA_FAILED_MESSAGE = "CAPTCHA validation failed. Please try again.";

/**
 * Verifies a Turnstile token when TURNSTILE_SECRET_KEY is configured. With no secret
 * the check is off, so the site keeps working until the keys are added. Once a secret
 * exists it fails closed: a missing token or an unreachable verifier rejects the post.
 */
export async function verifyCaptcha(
  secret: string | undefined,
  token: string | undefined,
  fetcher: typeof fetch = fetch,
): Promise<void> {
  if (!secret) return;
  if (!token) throw new Error(CAPTCHA_FAILED_MESSAGE);

  let success = false;
  try {
    const response = await fetcher(SITEVERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ secret, response: token }),
      signal: AbortSignal.timeout(5000),
    });
    const result = (await response.json()) as { success?: unknown };
    success = result.success === true;
  } catch (error) {
    console.error("[turnstile] verification request failed", error);
  }
  if (!success) throw new Error(CAPTCHA_FAILED_MESSAGE);
}
