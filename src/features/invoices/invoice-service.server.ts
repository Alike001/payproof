import "server-only";
import { z } from "zod";
import {
  CreatorAuthenticationError,
  requireCreatorSession,
  type CreatorSession,
} from "@/features/auth/creator-session.server";
import {
  createInvoiceInputSchema,
} from "@/features/invoices/schemas";
import {
  invoiceIdSchema,
  toCreatorInvoiceItem,
  toDuplicatePrefill,
  toPublicInvoiceDto,
  type InvoiceRow,
} from "@/features/invoices/model";
import type {
  CancelInvoiceResult,
  CreateInvoiceFieldErrors,
  CreateInvoiceInput,
  DashboardPageModel,
  PublicInvoicePageState,
  PublishInvoiceResult,
} from "@/features/invoices/types";
import { createUserDatabaseClient } from "@/lib/database/server";
import { getAdminDatabaseClient } from "@/lib/database/admin.server";
import { getPublicAppUrl } from "@/lib/database/config";
import { parseLocalAmount } from "@/lib/money";
import { readLatestPublicPaymentResult } from "@/features/payments/payment-result-read.server";

const invoiceColumns =
  "id,public_id,creator_user_id,creator_wallet,freelancer_name,client_reference,description,currency,amount_minor,minor_unit_decimals,recipient_wallet,due_date,lifecycle,created_at,cancelled_at,verified_at";
const historyLimit = 25;
const historyCursorSchema = z.strictObject({
  createdAt: z.iso.datetime(),
  id: z.uuid(),
});

const notFoundState: PublicInvoicePageState = {
  kind: "not_found",
  message: "This invoice link is invalid or no longer available.",
};
const unavailableState: PublicInvoicePageState = {
  kind: "unavailable",
  message: "This invoice is temporarily unavailable. Please try again.",
  retryable: true,
};

function today(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function fieldErrors(error: z.ZodError): CreateInvoiceFieldErrors {
  const result: CreateInvoiceFieldErrors = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as keyof CreateInvoiceInput | undefined;
    if (field && !result[field]) result[field] = issue.message;
  }
  return result;
}

function encodeCursor(row: InvoiceRow): string {
  return Buffer.from(
    JSON.stringify({ createdAt: row.created_at, id: row.id }),
  ).toString("base64url");
}

function decodeCursor(value: string) {
  try {
    return historyCursorSchema.parse(
      JSON.parse(Buffer.from(value, "base64url").toString("utf8")),
    );
  } catch {
    return null;
  }
}

function applicationContext() {
  return { appUrl: getPublicAppUrl(), today: today() };
}

async function creatorSession(
  provided?: CreatorSession,
): Promise<CreatorSession> {
  return provided ?? requireCreatorSession();
}

export async function publishInvoice(
  rawInput: unknown,
  providedCreator?: CreatorSession,
): Promise<PublishInvoiceResult> {
  const parsed = createInvoiceInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      code: "INVALID_INVOICE",
      message: "Review the highlighted invoice details.",
      fieldErrors: fieldErrors(parsed.error),
      retryable: false,
    };
  }

  const creator = await creatorSession(providedCreator);
  const amountUnits = parseLocalAmount(parsed.data.amount);
  const database = getAdminDatabaseClient();
  const { data, error } = await database
    .from("invoices")
    .insert({
      creator_user_id: creator.userId,
      creator_wallet: creator.address,
      recipient_wallet: creator.address,
      freelancer_name: parsed.data.freelancerName,
      client_reference: parsed.data.clientReference ?? null,
      description: parsed.data.description,
      currency: parsed.data.currency,
      amount_minor: Number(amountUnits),
      due_date: parsed.data.dueDate,
    })
    .select(invoiceColumns)
    .single();

  if (error || !data) {
    return {
      ok: false,
      code: "PUBLISH_UNAVAILABLE",
      message: "Invoice publishing is temporarily unavailable. Your invoice was not created.",
      fieldErrors: {},
      retryable: true,
    };
  }

  return {
    ok: true,
    invoice: toCreatorInvoiceItem({ row: data, ...applicationContext() }),
  };
}

export async function listCreatorInvoices(input: {
  cursor?: string | null;
  creator?: CreatorSession;
} = {}): Promise<DashboardPageModel> {
  await creatorSession(input.creator);
  const cursor = input.cursor ? decodeCursor(input.cursor) : null;
  if (input.cursor && !cursor) return { items: [], nextCursor: null };

  const database = await createUserDatabaseClient();
  let query = database
    .from("invoices")
    .select(invoiceColumns)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(historyLimit + 1);
  if (cursor) {
    query = query.or(
      `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`,
    );
  }
  const { data, error } = await query;
  if (error) throw new Error("Creator invoice history is unavailable.");

  const rows = (data ?? []) as InvoiceRow[];
  const page = rows.slice(0, historyLimit);
  const latestPaymentState = new Map<string, string>();
  if (page.length > 0) {
    const { data: paymentRows, error: paymentError } = await database
      .from("payments")
      .select("invoice_id,state,submitted_at")
      .in(
        "invoice_id",
        page.map((row) => row.id),
      )
      .order("submitted_at", { ascending: false });
    if (paymentError) {
      throw new Error("Creator invoice history is unavailable.");
    }
    for (const payment of paymentRows ?? []) {
      if (!latestPaymentState.has(payment.invoice_id)) {
        latestPaymentState.set(payment.invoice_id, payment.state);
      }
    }
  }
  const context = applicationContext();
  return {
    items: page.map((row) =>
      toCreatorInvoiceItem({
        row,
        ...context,
        latestPaymentState: latestPaymentState.get(row.id),
      }),
    ),
    nextCursor: rows.length > historyLimit ? encodeCursor(page.at(-1)!) : null,
  };
}

export async function getDuplicatePrefill(
  publicId: string,
  providedCreator?: CreatorSession,
): Promise<CreateInvoiceInput | null> {
  await creatorSession(providedCreator);
  if (!invoiceIdSchema.safeParse(publicId).success) return null;
  const database = await createUserDatabaseClient();
  const { data, error } = await database
    .from("invoices")
    .select(invoiceColumns)
    .eq("public_id", publicId)
    .maybeSingle();
  if (error || !data) return null;
  return toDuplicatePrefill(data);
}

export async function cancelCreatorInvoice(
  invoiceId: string,
  providedCreator?: CreatorSession,
): Promise<CancelInvoiceResult> {
  const creator = await creatorSession(providedCreator);
  if (!invoiceIdSchema.safeParse(invoiceId).success) {
    return {
      ok: false,
      code: "INVOICE_NOT_FOUND",
      message: "That invoice is not available in this wallet.",
      retryable: false,
    };
  }

  const database = getAdminDatabaseClient();
  const readOwnerRow = () =>
    database
      .from("invoices")
      .select(invoiceColumns)
      .eq("id", invoiceId)
      .eq("creator_user_id", creator.userId)
      .maybeSingle();
  const current = await readOwnerRow();
  if (current.error || !current.data) {
    return {
      ok: false,
      code: "INVOICE_NOT_FOUND",
      message: "That invoice is not available in this wallet.",
      retryable: false,
    };
  }
  if (current.data.lifecycle === "verified") {
    return {
      ok: false,
      code: "VERIFIED_INVOICE",
      message: "A verified invoice cannot be cancelled.",
      retryable: false,
    };
  }
  if (current.data.lifecycle === "cancelled") {
    return {
      ok: true,
      invoice: toCreatorInvoiceItem({
        row: current.data,
        ...applicationContext(),
      }),
    };
  }

  const { data, error } = await database
    .from("invoices")
    .update({ lifecycle: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("id", invoiceId)
    .eq("creator_user_id", creator.userId)
    .eq("lifecycle", "open")
    .select(invoiceColumns)
    .maybeSingle();
  if (error || !data) {
    return {
      ok: false,
      code: "CANCEL_UNAVAILABLE",
      message: "Invoice cancellation failed safely. The invoice was not changed.",
      retryable: true,
    };
  }
  return {
    ok: true,
    invoice: toCreatorInvoiceItem({ row: data, ...applicationContext() }),
  };
}

export async function readPublicInvoicePageState(
  publicId: string,
): Promise<PublicInvoicePageState> {
  if (!invoiceIdSchema.safeParse(publicId).success) return notFoundState;
  try {
    const database = getAdminDatabaseClient();
    const { data, error } = await database
      .from("invoices")
      .select(invoiceColumns)
      .eq("public_id", publicId)
      .maybeSingle();
    if (error) return unavailableState;
    if (!data) return notFoundState;
    const payment = await readLatestPublicPaymentResult({
      publicId,
      invoiceId: data.id,
      database,
    });
    return {
      kind: "ready",
      invoice: toPublicInvoiceDto({ row: data, ...applicationContext() }),
      payment,
    };
  } catch {
    return unavailableState;
  }
}

export { CreatorAuthenticationError };
