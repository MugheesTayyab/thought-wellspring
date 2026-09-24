import { createServerFn } from "@tanstack/react-start";
import { getServerEnv } from "@/server/lib/get-env";
import {
  wrapServerFn,
  extractBearerJwt,
  type ServerFnResult,
} from "@/server/lib/wrap-server-fn";
import { getSupabaseAnonClient } from "@/server/db/client";
import {
  claimDailyBonus,
  purchaseStoreItem,
} from "@/server/functions/warmth";
import { STORE_ITEMS } from "@/shared/constants/warmth";
import type { WarmthLogEntry } from "@/shared/types/warmth";

export interface ClaimBonusResponseData {
  warmthTotal: number;
  visitStreak: number;
  lastVisit: string;
  bonusAwarded: number;
  warmthLog: WarmthLogEntry[];
}

export interface PurchaseStoreItemResponseData {
  warmthTotal: number;
  purchasedItems: string[];
  purchasedItem: (typeof STORE_ITEMS)[number];
}

/**
 * Handlers (Directly callable and testable)
 */
export async function handleClaimDailyBonus(data?: {
  jwt?: string;
}): Promise<ServerFnResult<ClaimBonusResponseData>> {
  return wrapServerFn(async () => {
    const env = getServerEnv();
    const jwt = await extractBearerJwt(data?.jwt);

    if (!jwt) {
      throw new Error("Missing required authorization token (UNAUTHORIZED)");
    }

    const anonClient = getSupabaseAnonClient(env);
    const { data: userData, error: userError } = await anonClient.auth.getUser(jwt);

    if (userError || !userData?.user) {
      throw new Error("Invalid or expired session token (UNAUTHORIZED)");
    }

    return claimDailyBonus(env, userData.user.id);
  });
}

export async function handlePurchaseStoreItem(data: {
  itemId: string;
  jwt?: string;
}): Promise<ServerFnResult<PurchaseStoreItemResponseData>> {
  return wrapServerFn(async () => {
    const env = getServerEnv();
    const jwt = await extractBearerJwt(data?.jwt);

    if (!jwt) {
      throw new Error("Missing required authorization token (UNAUTHORIZED)");
    }

    const anonClient = getSupabaseAnonClient(env);
    const { data: userData, error: userError } = await anonClient.auth.getUser(jwt);

    if (userError || !userData?.user) {
      throw new Error("Invalid or expired session token (UNAUTHORIZED)");
    }

    return purchaseStoreItem(env, userData.user.id, data.itemId);
  });
}

/**
 * TanStack Start Server Functions
 */
export const apiClaimDailyBonus = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data?: { jwt?: string } }) => {
    return handleClaimDailyBonus(data);
  });

export const apiPurchaseStoreItem = createServerFn({ method: "POST" })
  .handler(
    async ({
      data,
    }: {
      data: {
        itemId: string;
        jwt?: string;
      };
    }) => {
      return handlePurchaseStoreItem(data);
    }
  );
