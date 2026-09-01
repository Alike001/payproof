import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database/types";
import { getServerEnv } from "@/lib/env.server";

let adminClient: SupabaseClient<Database> | undefined;

export function getAdminDatabaseClient(): SupabaseClient<Database> {
  if (!adminClient) {
    const environment = getServerEnv();
    adminClient = createClient<Database>(
      environment.NEXT_PUBLIC_SUPABASE_URL,
      environment.SUPABASE_SECRET_KEY,
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
