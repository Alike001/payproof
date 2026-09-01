import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicConfig } from "@/lib/database/config";
import type { Database } from "@/lib/database/types";

let browserClient: ReturnType<typeof createBrowserClient<Database>> | undefined;

export function getBrowserDatabaseClient() {
  if (!browserClient) {
    const { url, publishableKey } = getSupabasePublicConfig();
    browserClient = createBrowserClient<Database>(url, publishableKey);
  }

  return browserClient;
}
