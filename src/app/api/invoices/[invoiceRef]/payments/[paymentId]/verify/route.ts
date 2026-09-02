import { z } from "zod";
import { verifyPaymentAttempt } from "@/features/payments/verification-service.server";

export const runtime = "nodejs";

const emptyInputSchema = z.strictObject({});

export async function POST(
  request: Request,
  context: { params: Promise<{ invoiceRef: string; paymentId: string }> },
) {
  const requestId = crypto.randomUUID();
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    input = null;
  }
  if (!emptyInputSchema.safeParse(input).success) {
    return Response.json(
      {
        ok: false,
        code: "INVALID_VERIFICATION_REQUEST",
        message: "Send an empty JSON object to check this payment.",
        retryable: false,
        requestId,
      },
      { status: 400 },
    );
  }

  const { invoiceRef: publicId, paymentId } = await context.params;
  try {
    const result = await verifyPaymentAttempt(
      publicId,
      paymentId,
      request.headers,
    );
    const status = result.ok
      ? 200
      : result.code === "INVOICE_NOT_FOUND" || result.code === "PAYMENT_NOT_FOUND"
        ? 404
        : result.code === "INVOICE_NOT_PAYABLE"
          ? 409
          : result.code === "VERIFICATION_RATE_LIMITED"
            ? 429
            : 503;
    const headers = new Headers();
    if (!result.ok && result.retryAfterSeconds) {
      headers.set("retry-after", String(result.retryAfterSeconds));
    }
    return Response.json({ ...result, requestId }, { status, headers });
  } catch {
    return Response.json(
      {
        ok: false,
        code: "VERIFICATION_UNAVAILABLE",
        message: "Payment verification is temporarily unavailable. The saved transaction hash is safe to retry.",
        retryable: true,
        requestId,
      },
      { status: 503 },
    );
  }
}
