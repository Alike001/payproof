import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database/types";
import { getSupabaseAdminConfig } from "@/lib/database/admin-config.server";

let adminClient: SupabaseClient<Database> | undefined;

export function getAdminDatabaseClient(): SupabaseClient<Database> {
  if (!adminClient) {
    const environment = getSupabaseAdminConfig();
    adminClient = createClient<Database>(
      environment.url,
      environment.secretKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );
  }

  return adminClient;
}
