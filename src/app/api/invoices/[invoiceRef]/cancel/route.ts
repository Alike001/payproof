import {
  cancelCreatorInvoice,
  CreatorAuthenticationError,
} from "@/features/invoices/invoice-service.server";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  context: { params: Promise<{ invoiceRef: string }> },
) {
  const requestId = crypto.randomUUID();
  const { invoiceRef: invoiceId } = await context.params;
  try {
    const result = await cancelCreatorInvoice(invoiceId);
    const status = result.ok
      ? 200
      : result.code === "INVOICE_NOT_FOUND"
        ? 404
        : result.code === "VERIFIED_INVOICE"
          ? 409
          : 503;
    return Response.json(
      result.ok ? result : { ...result, requestId },
      { status },
    );
  } catch (error) {
    if (error instanceof CreatorAuthenticationError) {
      return Response.json(
        {
          ok: false,
          code: "AUTH_REQUIRED",
          message: "Reconnect your wallet and sign in before cancelling.",
          retryable: true,
          requestId,
        },
        { status: 401 },
      );
    }
    return Response.json(
      {
        ok: false,
        code: "CANCEL_UNAVAILABLE",
        message: "Invoice cancellation failed safely. The invoice was not changed.",
        retryable: true,
        requestId,
      },
      { status: 503 },
    );
  }
}
