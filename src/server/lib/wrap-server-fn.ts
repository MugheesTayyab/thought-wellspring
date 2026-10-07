/**
 * Server Function Response Wrapper & Error Mapping
 *
 * Enforces a strict, predictable response contract:
 * Success: { ok: true, data: T }
 * Failure: { ok: false, error: { code: string, message: string, statusCode?: number } }
 */
import { DeviceTokenError } from "../middleware/device-token";
import { RateLimitError } from "../middleware/rate-limit";

export type ServerFnSuccess<T> = {
  ok: true;
  data: T;
};

export type ServerFnFailure = {
  ok: false;
  error: {
    code: string;
    message: string;
    statusCode?: number;
  };
};

export type ServerFnResult<T> = ServerFnSuccess<T> | ServerFnFailure;

export function mapErrorToResponse(error: unknown): ServerFnFailure {
  // 1. Device Token Error
  if (
    error instanceof DeviceTokenError ||
    (error && typeof error === "object" && (error as any).name === "DeviceTokenError")
  ) {
    const err = error as DeviceTokenError;
    return {
      ok: false,
      error: {
        code: err.code || "INVALID_DEVICE_TOKEN",
        message: err.message,
        statusCode: 400,
      },
    };
  }

  // 2. Rate Limit Error
  if (
    error instanceof RateLimitError ||
    (error && typeof error === "object" && (error as any).name === "RateLimitError")
  ) {
    const err = error as RateLimitError;
    return {
      ok: false,
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: err.message,
        statusCode: 429,
      },
    };
  }

  // 3. Structured / Typed message errors
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
      ? error
      : "Unknown error occurred";

  if (/already reacted|already submitted this reaction/i.test(message)) {
    return {
      ok: false,
      error: {
        code: "ALREADY_REACTED",
        message,
        statusCode: 409,
      },
    };
  }

  if (/already voted/i.test(message)) {
    return {
      ok: false,
      error: {
        code: "ALREADY_VOTED",
        message,
        statusCode: 409,
      },
    };
  }

  if (/already reported|already flagged/i.test(message)) {
    return {
      ok: false,
      error: {
        code: "ALREADY_REPORTED",
        message,
        statusCode: 409,
      },
    };
  }

  if (/Author cannot|self.*veto|can't report own post/i.test(message)) {
    return {
      ok: false,
      error: {
        code: "SELF_VETO_FORBIDDEN",
        message,
        statusCode: 403,
      },
    };
  }

  if (/already claimed/i.test(message)) {
    return {
      ok: false,
      error: {
        code: "ALREADY_CLAIMED_TODAY",
        message,
        statusCode: 409,
      },
    };
  }

  if (/already purchased/i.test(message)) {
    return {
      ok: false,
      error: {
        code: "ALREADY_PURCHASED",
        message,
        statusCode: 409,
      },
    };
  }

  if (/insufficient.*warmth/i.test(message)) {
    return {
      ok: false,
      error: {
        code: "INSUFFICIENT_WARMTH",
        message,
        statusCode: 402,
      },
    };
  }

  if (/profile.*not found/i.test(message)) {
    return {
      ok: false,
      error: {
        code: "PROFILE_NOT_FOUND",
        message,
        statusCode: 404,
      },
    };
  }

  if (/echo limit/i.test(message)) {
    return {
      ok: false,
      error: {
        code: "ECHO_LIMIT_REACHED",
        message,
        statusCode: 422,
      },
    };
  }

  if (/not found|does not exist/i.test(message)) {
    return {
      ok: false,
      error: {
        code: "NOT_FOUND",
        message,
        statusCode: 404,
      },
    };
  }

  if (/unauthorized|jwt missing|invalid token|missing required authorization/i.test(message)) {
    return {
      ok: false,
      error: {
        code: "UNAUTHORIZED",
        message,
        statusCode: 401,
      },
    };
  }

  if (/validation|invalid category|invalid choice|must be at least|must not exceed/i.test(message)) {
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message,
        statusCode: 400,
      },
    };
  }

  // 4. Default unexpected error
  console.error("[wrapServerFn] Unexpected error caught:", error);
  return {
    ok: false,
    error: {
      code: "UNEXPECTED_ERROR",
      message: message || "Something went wrong, please try again.",
      statusCode: 500,
    },
  };
}

/**
 * Wrap an async handler with consistent error handling and response formatting
 */
export async function wrapServerFn<T>(
  handler: () => Promise<T>
): Promise<ServerFnResult<T>> {
  try {
    const result = await handler();
    return {
      ok: true,
      data: result,
    };
  } catch (error) {
    return mapErrorToResponse(error);
  }
}

/**
 * Helper to extract bearer JWT from explicit argument or request header
 */
export async function extractBearerJwt(explicitJwt?: string): Promise<string | null> {
  if (explicitJwt && explicitJwt.trim()) {
    return explicitJwt.trim();
  }

  try {
    const serverModule = await import("@tanstack/react-start/server");
    if (serverModule?.getRequestHeader) {
      const header =
        serverModule.getRequestHeader("authorization") ||
        serverModule.getRequestHeader("Authorization");
      if (header && typeof header === "string" && header.toLowerCase().startsWith("bearer ")) {
        return header.slice(7).trim();
      }
    }
  } catch {
    // getRequestHeader not available outside request context
  }

  return null;
}
