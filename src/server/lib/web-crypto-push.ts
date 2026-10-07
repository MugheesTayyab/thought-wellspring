// Native Web Crypto RFC 8291 & RFC 8292 implementation for Web Push
// Fully compatible with Cloudflare Workers (workerd) and Node 18+ with ZERO npm dependencies.

export interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

export interface WebPushSubscription {
  endpoint: string;
  keys: PushSubscriptionKeys;
}

export interface VapidDetails {
  subject: string;
  publicKey: string;
  privateKey: string;
}

export interface PushSendResult {
  status: number;
  statusText: string;
  success: boolean;
  isExpired: boolean;
}

// URL-safe Base64 utilities
export function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

export function uint8ArrayToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Creates a signed VAPID JWT (RFC 8292) using Web Crypto ES256
 */
export async function createVapidToken(
  audience: string,
  vapid: VapidDetails,
  expirationSeconds = 12 * 3600
): Promise<string> {
  const pubBytes = base64UrlToUint8Array(vapid.publicKey);
  const x = uint8ArrayToBase64Url(pubBytes.slice(1, 33));
  const y = uint8ArrayToBase64Url(pubBytes.slice(33, 65));
  const d = vapid.privateKey;

  // Import VAPID private key via JWK
  const signingKey = await crypto.subtle.importKey(
    "jwk",
    {
      kty: "EC",
      crv: "P-256",
      x,
      y,
      d,
      ext: true,
    },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + expirationSeconds,
    sub: vapid.subject,
  };

  const enc = new TextEncoder();
  const headerB64 = uint8ArrayToBase64Url(enc.encode(JSON.stringify(header)));
  const payloadB64 = uint8ArrayToBase64Url(enc.encode(JSON.stringify(payload)));
  const dataToSign = enc.encode(`${headerB64}.${payloadB64}`);

  const rawSignature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    signingKey,
    dataToSign
  );

  // Web Crypto returns 64-byte IEEE P1363 (r || s), standard for ES256 JWT
  const sigB64 = uint8ArrayToBase64Url(new Uint8Array(rawSignature));
  return `${headerB64}.${payloadB64}.${sigB64}`;
}

/**
 * Encrypts a payload according to RFC 8291 (Message Encryption for Web Push - aes128gcm)
 */
export async function encryptPayload(
  subscription: WebPushSubscription,
  payloadText: string
): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const plainBytes = enc.encode(payloadText);

  // 1. Generate ephemeral ECDH keypair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );

  const localPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey("raw", localKeyPair.publicKey)
  );

  // 2. Import subscriber's public key (p256dh)
  const subscriberPubBytes = base64UrlToUint8Array(subscription.keys.p256dh);
  const subscriberKey = await crypto.subtle.importKey(
    "raw",
    subscriberPubBytes,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // 3. Compute shared ECDH secret
  const sharedEcdhSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: subscriberKey },
      localKeyPair.privateKey,
      256
    )
  );

  // 4. Derive pseudo-random key (PRK) using auth secret
  const authSecret = base64UrlToUint8Array(subscription.keys.auth);
  const authKey = await crypto.subtle.importKey("raw", authSecret, "HKDF", false, [
    "deriveBits",
  ]);

  // HKDF info: "WebPush: info\0" + subscriberPublicKey + localPublicKey
  const infoPrefix = enc.encode("WebPush: info\0");
  const ikmInfo = new Uint8Array(infoPrefix.length + subscriberPubBytes.length + localPublicKeyRaw.length);
  ikmInfo.set(infoPrefix, 0);
  ikmInfo.set(subscriberPubBytes, infoPrefix.length);
  ikmInfo.set(localPublicKeyRaw, infoPrefix.length + subscriberPubBytes.length);

  // Derive 32-byte IKM (Input Keying Material)
  const ikm = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: sharedEcdhSecret,
      info: ikmInfo,
    },
    authKey,
    256
  );

  // 5. Generate random 16-byte salt for this record
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // 6. Derive CEK (Content Encryption Key, 16 bytes) and Nonce (12 bytes) using salt
  const ikmKey = await crypto.subtle.importKey("raw", ikm, "HKDF", false, [
    "deriveKey",
    "deriveBits",
  ]);

  // Derive AES-GCM-128 key
  const cekKey = await crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt,
      info: enc.encode("Content-Encoding: aes128gcm\0"),
    },
    ikmKey,
    { name: "AES-GCM", length: 128 },
    false,
    ["encrypt"]
  );

  // Derive Nonce
  const nonce = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt,
      info: enc.encode("Content-Encoding: nonce\0"),
    },
    ikmKey,
    96 // 12 bytes * 8
  );

  // 7. Pad plaintext with delimiter \x02
  const paddedPlain = new Uint8Array(plainBytes.length + 1);
  paddedPlain.set(plainBytes, 0);
  paddedPlain[plainBytes.length] = 2; // Delimiter

  // 8. Encrypt padded plaintext with AES-GCM
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: nonce,
      tagLength: 128,
    },
    cekKey,
    paddedPlain
  );

  // 9. Assemble aes128gcm body:
  // salt (16 bytes) + rs (record size, 4 bytes: 0x00, 0x00, 0x10, 0x00 = 4096) + idlen (1 byte: 65) + localPublicKey (65 bytes) + ciphertext
  const rs = 4096;
  const header = new Uint8Array(16 + 4 + 1 + 65);
  header.set(salt, 0);
  header[16] = (rs >> 24) & 0xff;
  header[17] = (rs >> 16) & 0xff;
  header[18] = (rs >> 8) & 0xff;
  header[19] = rs & 0xff;
  header[20] = 65; // idlen
  header.set(localPublicKeyRaw, 21);

  const finalBody = new Uint8Array(header.length + ciphertext.byteLength);
  finalBody.set(header, 0);
  finalBody.set(new Uint8Array(ciphertext), header.length);

  return finalBody;
}

/**
 * Sends a Web Push notification to a single subscriber endpoint
 */
export async function sendWebPushNotification(
  subscription: WebPushSubscription,
  payload: string,
  vapid: VapidDetails,
  ttlSeconds = 43200 // 12 hours
): Promise<PushSendResult> {
  const url = new URL(subscription.endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const vapidToken = await createVapidToken(audience, vapid);

  const encryptedBody = await encryptPayload(subscription, payload);

  const response = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aes128gcm",
      TTL: ttlSeconds.toString(),
      Urgency: "normal",
      Authorization: `vapid t=${vapidToken}, k=${vapid.publicKey}`,
    },
    body: encryptedBody,
  });

  const isSuccess = response.status === 201;
  const isExpired = response.status === 404 || response.status === 410;

  return {
    status: response.status,
    statusText: response.statusText,
    success: isSuccess,
    isExpired,
  };
}
