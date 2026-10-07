/**
 * Device Token Validation Middleware
 *
 * Every mutation on BajiHears requires an anonymous device anchor:
 * - 16-character lowercase hexadecimal string: /^[0-9a-f]{16}$/
 * - Present in 'x-device-token' header or body
 */

export class DeviceTokenError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, code: string = "INVALID_DEVICE_TOKEN") {
    super(message);
    this.name = "DeviceTokenError";
    this.statusCode = 400;
    this.code = code;
  }
}

/**
 * Validate raw token string
 */
export function validateDeviceToken(token?: string | null): string {
  if (!token || typeof token !== "string" || token.trim() === "") {
    throw new DeviceTokenError("Missing required X-Device-Token header", "MISSING_DEVICE_TOKEN");
  }

  const normalized = token.trim().toLowerCase();

  if (normalized.length !== 16) {
    throw new DeviceTokenError(
      `Device token must be exactly 16 characters. Received: ${normalized.length}`,
      "INVALID_DEVICE_TOKEN_LENGTH"
    );
  }

  if (!/^[0-9a-f]{16}$/.test(normalized)) {
    throw new DeviceTokenError(
      "Device token must be a valid 16-character lowercase hex string",
      "INVALID_DEVICE_TOKEN_FORMAT"
    );
  }

  return normalized;
}

/**
 * Extract and validate device token from Request or Headers
 */
export function extractDeviceToken(reqOrHeaders: Request | Headers | Record<string, string | undefined>): string {
  let token: string | null | undefined;

  if (typeof Request !== "undefined" && reqOrHeaders instanceof Request) {
    token = reqOrHeaders.headers.get("x-device-token");
  } else if (typeof Headers !== "undefined" && reqOrHeaders instanceof Headers) {
    token = reqOrHeaders.get("x-device-token");
  } else if (typeof reqOrHeaders === "object" && reqOrHeaders !== null) {
    const record = reqOrHeaders as Record<string, string | undefined>;
    token = record["x-device-token"] || record["X-Device-Token"];
  }

  return validateDeviceToken(token);
}
