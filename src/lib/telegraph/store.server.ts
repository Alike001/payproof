import "server-only";
import type { Json } from "@/lib/database/types";
import { getAdminDatabaseClient } from "@/lib/database/admin.server";
import type { TelegraphSpendStore } from "@/lib/telegraph/transport";

function nullableUuid(value: string | null): string {
  return value as string;
}

function asJson(value: unknown): Json {
  return value as Json;
}

export const telegraphSpendStore: TelegraphSpendStore = {
  async reserve(input) {
    const { data, error } = await getAdminDatabaseClient().rpc(
      "reserve_telegraph_spend",
      {
        p_action_key: input.actionKey,
        p_invoice_id: nullableUuid(input.invoiceId),
        p_quote_id: nullableUuid(input.quoteId),
        p_payment_id: nullableUuid(input.paymentId),
        p_intent: input.intent,
        p_miner_id: input.minerId,
        p_miner_name: input.minerName,
        p_attempt_role: input.attemptRole,
        p_request_sanitized: asJson(input.requestSanitized),
        p_x402_network: input.network,
        p_amount_units: Number(input.amountUnits),
        p_daily_budget_units: Number(input.dailyBudgetUnits),
      },
    );
    if (error || !data?.[0]) {
      throw new Error("Unable to reserve the Telegraph spend safely.");
    }
    return {
      callId: data[0].call_id,
      reserved: data[0].reserved,
      callStatus: data[0].call_status,
    };
  },

  async finalize(input) {
    const { data, error } = await getAdminDatabaseClient()
      .from("telegraph_calls")
      .update({
        status: input.status,
        response_raw:
          input.responseSanitized === null
            ? null
            : asJson(input.responseSanitized),
        error_code: input.errorCode,
        error_message: input.errorMessage,
        x402_transaction: input.settlement?.transaction ?? null,
        latency_ms: input.latencyMs,
        completed_at: new Date().toISOString(),
      })
      .eq("id", input.callId)
      .eq("status", "started")
      .select("id")
      .maybeSingle();
    if (error || !data) {
      throw new Error("Unable to finalize the Telegraph call record.");
    }
  },
};
