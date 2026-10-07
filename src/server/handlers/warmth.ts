import type {
  ClaimBonusResponseData,
  PurchaseStoreItemResponseData,
  ServerFnResult,
} from "@/shared/types/api";
import { wrapServerFn, extractBearerJwt } from "@/server/lib/wrap-server-fn";
import { getServerEnv } from "@/server/lib/get-env";
import { getSupabaseAnonClient } from "@/server/db/client";
import {
  claimDailyBonus,
  purchaseStoreItem,
  syncWarmth,
} from "@/server/functions/warmth";

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

export async function handleSyncWarmth(
  data: {
    deviceToken: string;
    localWarmth: number;
    profileId?: string | null;
  }
): Promise<ServerFnResult<{ serverTotal: number }>> {
  return wrapServerFn(async () => {
    const env = getServerEnv();
    return syncWarmth(env, data);
  });
}
