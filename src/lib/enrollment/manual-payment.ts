export const bkashTransactionIdPattern = /^[A-Z0-9]{4,32}$/;
export const bkashTransactionIdError = "Enter the bKash Transaction ID from your payment receipt.";

export function normalizeBkashTransactionId(value: string): string {
  return value.trim().toUpperCase();
}
