import fs from "node:fs";
import path from "node:path";
import type { EnrollmentConfig } from "./types";

export function getEnrollmentConfig(): EnrollmentConfig {
  const filePath = path.join(process.cwd(), "content", "enrollment", "config.json");
  if (!fs.existsSync(filePath)) {
    return {
      programQuestions: {},
      payment: {
        bkash: { enabled: true },
        bankTransfer: {
          enabled: true,
          bankDetails: {
            bankName: "City Bank",
            accountName: "Lead Nation Academy Ltd.",
            accountNumber: "1503 8291 0001",
            branch: "Dhanmondi Branch, Dhaka",
          },
        },
      },
    };
  }
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw);
}
