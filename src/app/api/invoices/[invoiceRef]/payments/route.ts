import { submitPaymentAttempt } from "@/features/payments/payment-service.server";
import { operationalLog } from "@/lib/observability/logger.server";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ invoiceRef: string }> },
) {
  const requestId = crypto.randomUUID();
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    operationalLog("error", "payment_submission", {
      outcome: "unavailable",
      requestId,
      code: "PAYMENT_UNAVAILABLE",
    });
    input = null;
  }

  const { invoiceRef: publicId } = await context.params;
  try {
    const result = await submitPaymentAttempt(publicId, input, request.headers);
    return paymentResponse(result, requestId);
  } catch {
    return Response.json(
      {
        ok: false,
        code: "PAYMENT_UNAVAILABLE",
        message: "The transaction hash could not be saved safely. Do not send another payment yet.",
        retryable: true,
        requestId,
      },
      { status: 503 },
    );
  }
}

function paymentResponse(
  result: Awaited<ReturnType<typeof submitPaymentAttempt>>,
  requestId: string,
) {
  const status = result.ok
    ? result.reused
      ? 200
      : 201
    : result.code === "INVALID_PAYMENT"
      ? 400
      : result.code === "INVOICE_NOT_FOUND"
        ? 404
        : result.code === "PAYMENT_RATE_LIMITED"
          ? 429
          : result.code === "PAYMENT_UNAVAILABLE"
            ? 503
            : 409;
  const headers = new Headers();
  if (!result.ok && result.retryAfterSeconds) {
    headers.set("retry-after", String(result.retryAfterSeconds));
  }
  return Response.json({ ...result, requestId }, { status, headers });
}
