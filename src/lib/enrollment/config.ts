import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import type { EnrollmentConfig } from "./types";

export const ProgramQuestionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(["text", "select", "textarea"]),
  placeholder: z.string().optional(),
  options: z.array(z.string().min(1)).optional(),
  required: z.boolean(),
});

export const EnrollmentConfigSchema = z.object({
  programQuestions: z.record(z.array(ProgramQuestionSchema)),
  payment: z.object({
    submissionEnabled: z.boolean().default(false),
    bkash: z.object({
      enabled: z.boolean(),
      merchantName: z.string().min(1),
      merchantNumber: z.string().min(1),
      qrImageSrc: z.string().min(1),
      qrImageAlt: z.string().min(1),
      instruction: z.string().min(1),
    }),
    bankTransfer: z.object({
      enabled: z.boolean(),
      instruction: z.string().min(1),
      bankDetails: z
        .object({
          bankName: z.string().min(1),
          accountName: z.string().min(1),
          accountNumber: z.string().min(1),
          branch: z.string().min(1).optional(),
          routingNumber: z.string().min(1).optional(),
        })
        .nullable(),
    }),
  }),
});

const DEFAULT_ENROLLMENT_CONFIG: EnrollmentConfig = {
  programQuestions: {},
  payment: {
    submissionEnabled: false,
    bkash: {
      enabled: true,
      merchantName: "Lead Nation Academy",
      merchantNumber: "0158 1799 666",
      qrImageSrc: "/images/payments/lna-bkash-merchant-qr.png",
      qrImageAlt: "Lead Nation Academy official bKash Merchant QR code",
      instruction:
        "Scan the official LNA bKash Merchant QR code, pay the exact amount due, and enter your bKash Transaction ID below.",
    },
    bankTransfer: {
      enabled: true,
      instruction:
        "Transfer the exact amount due to the official Lead Nation Academy bank account below, then enter your bank-issued Transaction Reference.",
      bankDetails: {
        bankName: "Mutual Trust Bank PLC",
        accountName: "Lead Nation Academy - LNA",
        accountNumber: "130100052843",
      },
    },
  },
};

export function getEnrollmentConfig(): EnrollmentConfig {
  const filePath = path.join(process.cwd(), "content", "enrollment", "config.json");
  if (!fs.existsSync(filePath)) {
    return DEFAULT_ENROLLMENT_CONFIG;
  }
  const raw = fs.readFileSync(filePath, "utf-8");
  return EnrollmentConfigSchema.parse(JSON.parse(raw));
}
