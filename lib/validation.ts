import { z } from "zod";

const optionalDateString = z
  .string()
  .trim()
  .min(1)
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "Invalid date",
  });

export const categoryCreateSchema = z.object({
  name: z.string().trim().min(1, "Category name is required").max(60),
  icon: z.string().trim().min(1).optional(),
});

export const categoryUpdateSchema = z.object({
  name: z.string().trim().min(1, "Category name is required").max(60),
  icon: z.string().trim().min(1).optional(),
});

export const expenseCreateSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  amount: z.union([z.number(), z.string()]).transform((value, ctx) => {
    const amount = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(amount) || amount <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Amount must be a positive number",
      });
      return z.NEVER;
    }
    return amount;
  }),
  category: z.string().trim().min(1, "Category is required").max(60),
  date: optionalDateString,
  description: z.string().trim().max(500).nullable().optional(),
  source: z.enum(["manual", "voice", "gmail"]).optional(),
  recordType: z
    .enum(["expense", "income", "liability", "reimbursement"])
    .optional(),
  isRecurring: z.boolean().optional(),
  recurringInterval: z.string().trim().min(1).max(40).nullable().optional(),
  status: z.enum(["completed", "open", "settled"]).optional(),
  counterparty: z.string().trim().max(120).nullable().optional(),
});

export const expenseUpdateSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(120).optional(),
    amount: z
      .union([z.number(), z.string()])
      .transform((value, ctx) => {
        const amount = typeof value === "number" ? value : Number(value);
        if (!Number.isFinite(amount) || amount <= 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Amount must be a positive number",
          });
          return z.NEVER;
        }
        return amount;
      })
      .optional(),
    category: z
      .string()
      .trim()
      .min(1, "Category is required")
      .max(60)
      .optional(),
    date: optionalDateString.optional(),
    description: z.string().trim().max(500).nullable().optional(),
    source: z.enum(["manual", "voice", "gmail"]).optional(),
    recordType: z
      .enum(["expense", "income", "liability", "reimbursement"])
      .optional(),
    isRecurring: z.boolean().optional(),
    recurringInterval: z.string().trim().min(1).max(40).nullable().optional(),
    status: z.enum(["completed", "open", "settled"]).optional(),
    counterparty: z.string().trim().max(120).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });

export const userCreateSchema = z.object({
  id: z.string().trim().min(1),
  email: z.string().trim().optional().nullable(),
});
