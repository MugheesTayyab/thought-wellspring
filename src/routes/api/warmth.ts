import { createServerFn } from "@tanstack/react-start";
import type {
  ClaimBonusResponseData,
  PurchaseStoreItemResponseData,
} from "@/shared/types/api";

export type {
  ClaimBonusResponseData,
  PurchaseStoreItemResponseData,
};

export const apiClaimDailyBonus = createServerFn({ method: "POST" })
  .validator((data?: { jwt?: string }) => data)
  .handler(async ({ data }) => {
    const { handleClaimDailyBonus } = await import("@/server/handlers/warmth");
    return handleClaimDailyBonus(data);
  });

export const apiPurchaseStoreItem = createServerFn({ method: "POST" })
  .validator((data: { itemId: string; jwt?: string }) => data)
  .handler(async ({ data }) => {
    const { handlePurchaseStoreItem } = await import("@/server/handlers/warmth");
    return handlePurchaseStoreItem(data);
  });

export const apiSyncWarmth = createServerFn({ method: "POST" })
  .validator(
    (data: {
      deviceToken: string;
      localWarmth: number;
      profileId?: string | null;
    }) => data
  )
  .handler(async ({ data }) => {
    const { handleSyncWarmth } = await import("@/server/handlers/warmth");
    return handleSyncWarmth(data);
  });
