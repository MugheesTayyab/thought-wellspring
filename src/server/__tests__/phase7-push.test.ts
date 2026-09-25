import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  base64UrlToUint8Array,
  uint8ArrayToBase64Url,
  createVapidToken,
  encryptPayload,
  sendWebPushNotification,
  type WebPushSubscription,
  type VapidDetails,
} from "../lib/web-crypto-push";
import { dispatchWinnerPushNotification } from "../jobs/push-dispatch";
import * as pushDb from "../db/push-subscriptions";

describe("Phase 7: Web Push Native WebCrypto Engine", () => {
  const testVapid: VapidDetails = {
    subject: "mailto:admin@bajihears.com",
    publicKey: "BC2J76RtDSeeFuYN3VnrvChrz3qKHVD_bhO1eKaFHl3RO5dz3CUA8JOMIoicqBQG5XBrE1WvriUXP5RDAOmugsI",
    privateKey: "6IdFNGeTGKN_FA6gGG2JRDl-BD00sq0MtieScMuD8mo",
  };

  it("safely round-trips URL-safe Base64 and Uint8Array", () => {
    const raw = new Uint8Array([1, 2, 3, 254, 255, 0, 42]);
    const b64 = uint8ArrayToBase64Url(raw);
    const restored = base64UrlToUint8Array(b64);
    expect(restored).toEqual(raw);
  });

  it("generates a valid ES256 VAPID JWT token", async () => {
    const audience = "https://fcm.googleapis.com";
    const token = await createVapidToken(audience, testVapid);

    expect(token).toBeTruthy();
    const parts = token.split(".");
    expect(parts.length).toBe(3);

    // Decode header & payload
    const header = JSON.parse(new TextDecoder().decode(base64UrlToUint8Array(parts[0])));
    expect(header).toEqual({ typ: "JWT", alg: "ES256" });

    const payload = JSON.parse(new TextDecoder().decode(base64UrlToUint8Array(parts[1])));
    expect(payload.aud).toBe(audience);
    expect(payload.sub).toBe(testVapid.subject);
    expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it("encrypts payload using RFC 8291 aes128gcm with simulated subscriber keys", async () => {
    // Generate a subscriber keypair for testing
    const subscriberKeyPair = await crypto.subtle.generateKey(
      { name: "ECDH", namedCurve: "P-256" },
      true,
      ["deriveBits"]
    );
    const pubRaw = new Uint8Array(await crypto.subtle.exportKey("raw", subscriberKeyPair.publicKey));
    const authRaw = crypto.getRandomValues(new Uint8Array(16));

    const subscription: WebPushSubscription = {
      endpoint: "https://fcm.googleapis.com/fcm/send/fake-test-endpoint",
      keys: {
        p256dh: uint8ArrayToBase64Url(pubRaw),
        auth: uint8ArrayToBase64Url(authRaw),
      },
    };

    const payloadText = JSON.stringify({
      title: "The new winner is in ✨",
      body: "Winner post excerpt...",
      url: "/",
    });

    const encrypted = await encryptPayload(subscription, payloadText);
    expect(encrypted).toBeInstanceOf(Uint8Array);
    // aes128gcm header is 86 bytes (16 salt + 4 rs + 1 idlen + 65 key) + encrypted payload + 16-byte auth tag
    expect(encrypted.length).toBeGreaterThan(86 + payloadText.length);
  });

  it("handles push server responses correctly (201 Created vs 410 Gone)", async () => {
    const subscriberKeyPair = await crypto.subtle.generateKey(
      { name: "ECDH", namedCurve: "P-256" },
      true,
      ["deriveBits"]
    );
    const pubRaw = new Uint8Array(await crypto.subtle.exportKey("raw", subscriberKeyPair.publicKey));
    const authRaw = crypto.getRandomValues(new Uint8Array(16));

    const sub: WebPushSubscription = {
      endpoint: "https://fcm.googleapis.com/fcm/send/test-sub",
      keys: {
        p256dh: uint8ArrayToBase64Url(pubRaw),
        auth: uint8ArrayToBase64Url(authRaw),
      },
    };

    // Mock fetch for 201 Created
    global.fetch = vi.fn().mockResolvedValue({
      status: 201,
      statusText: "Created",
    });

    const successRes = await sendWebPushNotification(sub, "test payload", testVapid);
    expect(successRes.success).toBe(true);
    expect(successRes.isExpired).toBe(false);

    // Mock fetch for 410 Gone
    global.fetch = vi.fn().mockResolvedValue({
      status: 410,
      statusText: "Gone",
    });

    const expiredRes = await sendWebPushNotification(sub, "test payload", testVapid);
    expect(expiredRes.success).toBe(false);
    expect(expiredRes.isExpired).toBe(true);
  });

  it("skips dispatch if push was already delivered for the cycle (idempotency)", async () => {
    vi.spyOn(pushDb, "hasCyclePushDispatched").mockResolvedValue(true);

    const result = await dispatchWinnerPushNotification({
      winnerId: "123e4567-e89b-12d3-a456-426614174000",
      hook: "Tonight's Crowned Unsaid",
      excerpt: "Sample excerpt",
      category: "Confession",
      cycleTimestamp: 1727280000000,
    });

    expect(result.dispatched).toBe(true);
    expect(result.skippedReason).toBe("ALREADY_DISPATCHED");
  });
});
