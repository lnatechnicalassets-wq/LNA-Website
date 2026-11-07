/**
 * Application error class with stable error codes.
 * Conforms to Rule R16:
 * - Stable, predictable error codes
 * - Safe for telemetry and user feedback without exposing secrets or personal data
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(message: string, code: string, statusCode = 400, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
