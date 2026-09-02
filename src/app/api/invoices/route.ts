import {
  CreatorAuthenticationError,
  publishInvoice,
} from "@/features/invoices/invoice-service.server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return Response.json(
      {
        ok: false,
        code: "INVALID_JSON",
        message: "Send valid invoice details as JSON.",
        fieldErrors: {},
        retryable: false,
        requestId,
      },
      { status: 400 },
    );
  }

  try {
    const result = await publishInvoice(input);
    const status = result.ok
      ? 201
      : result.code === "INVALID_INVOICE"
        ? 400
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
          message: "Reconnect your wallet and sign in before publishing.",
          fieldErrors: {},
          retryable: true,
          requestId,
        },
        { status: 401 },
      );
    }
    return Response.json(
      {
        ok: false,
        code: "PUBLISH_UNAVAILABLE",
        message: "Invoice publishing is temporarily unavailable. Your invoice was not created.",
        fieldErrors: {},
        retryable: true,
        requestId,
      },
      { status: 503 },
    );
  }
}
