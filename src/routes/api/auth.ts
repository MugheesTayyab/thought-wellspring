import { createServerFn } from "@tanstack/react-start";
import type { MigrateGuestData, RefreshProfileData } from "@/shared/types/api";

export type { MigrateGuestData, RefreshProfileData };

export const apiMigrateGuestToAccount = createServerFn({ method: "POST" })
  .validator(
    (data: {
      deviceToken: string;
      handle: string;
      avatarSeed?: number;
      jwt?: string;
    }) => data
  )
  .handler(async ({ data }) => {
    const { handleMigrateGuestToAccount } = await import("@/server/handlers/auth");
    return handleMigrateGuestToAccount(data);
  });

export const apiRefreshProfile = createServerFn({ method: "GET" })
  .validator((data?: { jwt?: string }) => data)
  .handler(async ({ data }) => {
    const { handleRefreshProfile } = await import("@/server/handlers/auth");
    return handleRefreshProfile(data);
  });
