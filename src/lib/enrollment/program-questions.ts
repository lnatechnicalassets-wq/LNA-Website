import { z } from "zod";
import type { ProgramQuestion } from "./types";

export const staleQuestionsMessage =
  "Application questions have changed. Reload the form and review the questions. If you already paid, keep your receipt and do not pay again.";

const reserved = new Set([
  "constructor",
  "prototype",
  "tostring",
  "tolocalestring",
  "valueof",
  "hasownproperty",
  "isprototypeof",
  "propertyisenumerable",
  "fullname",
  "email",
  "phone",
  "whatsapp",
  "courseid",
  "batchid",
  "transactionid",
  "policy",
  "paymentmethod",
  "applicationreference",
]);

const questionSchema = z
  .object({
    id: z
      .string()
      .regex(/^[A-Za-z][A-Za-z0-9_]{0,63}$/)
      .refine((id) => !reserved.has(id.toLowerCase())),
    label: z.string().trim().min(1).max(160),
    type: z.enum(["text", "select", "textarea"]),
    placeholder: z.string().trim().max(200).optional(),
    options: z.array(z.string().trim().min(1).max(160)).min(2).max(30).optional(),
    required: z.boolean(),
  })
  .strict()
  .superRefine((question, context) => {
    if (question.type === "select") {
      if (!question.options || new Set(question.options).size !== question.options.length) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Select questions need unique options.",
        });
      }
    } else if (question.options !== undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Only select questions can have options.",
      });
    }
  });

export const programQuestionSetSchema = z
  .array(questionSchema)
  .max(20)
  .superRefine((questions, context) => {
    if (new Set(questions.map((question) => question.id.toLowerCase())).size !== questions.length) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "Question IDs must be unique." });
    }
  });

export const questionSetVersionSchema = z.number().int().min(0).max(2147483647);

export interface ProgramQuestionSet {
  questions: ProgramQuestion[];
  version: number;
}

// Version zero is the legacy read-only configuration. Omission is permitted only
// for old clients on that baseline; database-configured sets require a version.
export function matchesQuestionVersion(expected: number, submitted: unknown): boolean {
  if (submitted === undefined) return expected === 0;
  return typeof submitted === "number" && Number.isInteger(submitted) && submitted === expected;
}

export function parseQuestionVersionField(
  value: FormDataEntryValue | null
): number | null | undefined {
  if (value === null) return undefined;
  if (typeof value !== "string" || !/^\d{1,10}$/.test(value)) return null;
  const parsed = questionSetVersionSchema.safeParse(Number(value));
  return parsed.success ? parsed.data : null;
}
