import { z } from "zod";
import { normalizeAddress } from "@/lib/address";
import {
  MoneyInputError,
  parseLocalAmount,
  SUPPORTED_CURRENCIES,
} from "@/lib/money";

export const currencySchema = z.enum(SUPPORTED_CURRENCIES);

export const localAmountSchema = z.string().superRefine((value, context) => {
  try {
    parseLocalAmount(value);
  } catch (error) {
    context.addIssue({
      code: "custom",
      message:
        error instanceof MoneyInputError ? error.message : "Enter a valid amount.",
    });
  }
});

export const ethereumAddressSchema = z.string().transform((value, context) => {
  try {
    return normalizeAddress(value);
  } catch {
    context.addIssue({
      code: "custom",
      message: "Enter a valid Ethereum wallet address.",
    });
    return z.NEVER;
  }
});

export const createInvoiceInputSchema = z.strictObject({
  freelancerName: z.string().trim().min(1).max(100),
  clientReference: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((value) => value || undefined),
  description: z.string().trim().min(1).max(500),
  currency: currencySchema,
  amount: localAmountSchema,
  dueDate: z.iso.date(),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceInputSchema>;
