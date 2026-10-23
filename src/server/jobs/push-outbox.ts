import { getSupabaseAdminClient, type DatabaseEnv } from "../db/client";
import { sendWebPushNotification } from "../lib/web-crypto-push";

export async function drainPushOutbox(env: DatabaseEnv): Promise<void> {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY || !env.VAPID_SUBJECT) return;
  const client = getSupabaseAdminClient(env);
  const { data, error } = await client.rpc("claim_push_batch", { p_limit: 25 });
  if (error) throw new Error("Push queue could not be read");
  if (!data?.length) return;
  const results: Array<{ id: string; success: boolean; expired: boolean }> = [];
  for (let i = 0; i < data.length; i += 5) {
    const chunk = data.slice(i, i + 5) as Array<{
      id: string;
      endpoint: string;
      keys: { p256dh: string; auth: string };
      payload: unknown;
    }>;
    results.push(
      ...(await Promise.all(
        chunk.map(async (row) => {
          try {
            const result = await sendWebPushNotification(row, JSON.stringify(row.payload), {
              publicKey: env.VAPID_PUBLIC_KEY!,
              privateKey: env.VAPID_PRIVATE_KEY!,
              subject: env.VAPID_SUBJECT!,
            });
            return { id: row.id, success: result.success, expired: result.isExpired };
          } catch {
            return { id: row.id, success: false, expired: false };
          }
        }),
      )),
    );
  }
  const completed = await client.rpc("complete_push_batch", { p_results: results });
  if (completed.error) throw new Error("Push delivery results could not be saved");
}
