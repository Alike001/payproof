import { z } from "zod";
import { requestInvoiceQuote } from "@/features/quotes/quote-service.server";

export const runtime = "nodejs";

const emptyInputSchema = z.strictObject({});

export async function POST(
  request: Request,
  context: { params: Promise<{ publicId: string }> },
) {
  const requestId = crypto.randomUUID();
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  if (!emptyInputSchema.safeParse(body).success) {
    return Response.json(
      {
        ok: false,
        code: "INVALID_QUOTE_REQUEST",
        message: "Send an empty JSON object to request a quote.",
        retryable: false,
        requestId,
      },
      { status: 400 },
    );
  }

  const { publicId } = await context.params;
  try {
    const result = await requestInvoiceQuote(publicId, request.headers);
    const status = result.ok
      ? 200
      : result.code === "INVOICE_NOT_FOUND"
        ? 404
        : result.code === "INVOICE_NOT_PAYABLE"
          ? 409
          : result.code === "QUOTE_RATE_LIMITED" || result.code === "QUOTE_COOLDOWN"
            ? 429
            : 503;
    const headers = new Headers();
    if (!result.ok && result.retryAfterSeconds) {
      headers.set("retry-after", String(result.retryAfterSeconds));
    }
    return Response.json(
      { ...result, requestId },
      { status, headers },
    );
  } catch {
    return Response.json(
      {
        ok: false,
        code: "QUOTE_UNAVAILABLE",
        message: "A trustworthy quote is temporarily unavailable. Payment remains paused.",
        retryable: true,
        requestId,
      },
      { status: 503 },
    );
  }
}
