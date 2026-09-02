import "server-only";
import { getSupabasePublicConfig } from "@/lib/database/config";

export function getSupabaseAdminConfig() {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Missing server database configuration: SUPABASE_SECRET_KEY");
  }
  return { ...getSupabasePublicConfig(), secretKey };
}
