import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database/types";
import { getAdminDatabaseClient } from "@/lib/database/admin.server";
import {
  toPublicPaymentResultDto,
  type PaymentResultSnapshot,
} from "@/features/payments/result-model";
import type { PublicPaymentResultDto } from "@/features/payments/types";

type AdminDatabase = SupabaseClient<Database>;
const paymentColumns =
  "id,invoice_id,quote_id,tx_hash,submitted_by_wallet,state,mismatch_code,observed_chain_id,observed_token,observed_recipient,observed_amount_units,observed_tx_status,verification_call_id,verification_observed_at,verification_source,submitted_at,last_checked_at,verified_transfer_sender,verified_at";
const invoiceColumns = "id,public_id,recipient_wallet,lifecycle";
const quoteColumns = "id,invoice_id,usdc_amount_units";
const callColumns = "id,miner_id,miner_name,attempt_role";

export async function loadPaymentResultSnapshot(input: {
  database: AdminDatabase;
  publicId: string;
  paymentId: string;
}): Promise<PaymentResultSnapshot | null> {
  const paymentResult = await input.database
    .from("payments")
    .select(paymentColumns)
    .eq("id", input.paymentId)
    .maybeSingle();
  if (paymentResult.error) throw new Error("Payment lookup failed.");
  if (!paymentResult.data) return null;
  const payment = paymentResult.data;

  const [invoiceResult, quoteResult] = await Promise.all([
    input.database
      .from("invoices")
      .select(invoiceColumns)
      .eq("id", payment.invoice_id)
      .eq("public_id", input.publicId)
      .maybeSingle(),
    input.database
      .from("quotes")
      .select(quoteColumns)
      .eq("id", payment.quote_id)
      .eq("invoice_id", payment.invoice_id)
      .maybeSingle(),
  ]);
  if (invoiceResult.error || quoteResult.error) {
    throw new Error("Payment relationship lookup failed.");
  }
  if (!invoiceResult.data || !quoteResult.data) return null;

  let call: PaymentResultSnapshot["call"] = null;
  if (payment.verification_call_id) {
    const callResult = await input.database
      .from("telegraph_calls")
      .select(callColumns)
      .eq("id", payment.verification_call_id)
      .eq("payment_id", payment.id)
      .maybeSingle();
    if (callResult.error || !callResult.data) {
      throw new Error("Verification provenance lookup failed.");
    }
    call = callResult.data;
  }

  return {
    payment,
    invoice: invoiceResult.data,
    quote: quoteResult.data,
    call,
  };
}

export async function readLatestPublicPaymentResult(input: {
  publicId: string;
  invoiceId: string;
  database?: AdminDatabase;
}): Promise<PublicPaymentResultDto | null> {
  const database = input.database ?? getAdminDatabaseClient();
  const { data, error } = await database
    .from("payments")
    .select("id")
    .eq("invoice_id", input.invoiceId)
    .order("submitted_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error("Public payment lookup failed.");
  if (!data) return null;
  const snapshot = await loadPaymentResultSnapshot({
    database,
    publicId: input.publicId,
    paymentId: data.id,
  });
  if (!snapshot) throw new Error("Public payment relationship is invalid.");
  return toPublicPaymentResultDto({ snapshot });
}
