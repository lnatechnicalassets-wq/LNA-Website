/**
 * Money utilities conforming to Rule R5:
 * Integer poisha only (1 BDT = 100 poisha).
 * Zero floating-point arithmetic. Zero parseFloat(), Number(), or .toFixed() for chargeable amounts.
 */

/**
 * Converts integer poisha into a localized BDT display string (e.g., 2500000 -> "৳25,000" or "৳25,000.50").
 */
export function formatPoishaToBDT(poishaInput: number | bigint | string): string {
  const poisha = typeof poishaInput === "bigint" ? poishaInput : BigInt(poishaInput);
  const isNegative = poisha < 0n;
  const absPoisha = isNegative ? -poisha : poisha;

  const taka = absPoisha / 100n;
  const remPoisha = absPoisha % 100n;

  // Format taka with thousand separators using string manipulation
  const takaStr = taka.toString();
  const formattedTaka = takaStr.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  const sign = isNegative ? "-" : "";
  if (remPoisha === 0n) {
    return `${sign}৳${formattedTaka}`;
  }

  const paddedRem = remPoisha < 10n ? `0${remPoisha.toString()}` : remPoisha.toString();
  return `${sign}৳${formattedTaka}.${paddedRem}`;
}

/**
 * Converts integer poisha to pure decimal taka string (e.g., 2500000 -> "25000.00").
 */
export function poishaToTakaString(poishaInput: number | bigint | string): string {
  const poisha = typeof poishaInput === "bigint" ? poishaInput : BigInt(poishaInput);
  const isNegative = poisha < 0n;
  const absPoisha = isNegative ? -poisha : poisha;

  const taka = absPoisha / 100n;
  const remPoisha = absPoisha % 100n;

  const paddedRem = remPoisha < 10n ? `0${remPoisha.toString()}` : remPoisha.toString();
  const sign = isNegative ? "-" : "";
  return `${sign}${taka.toString()}.${paddedRem}`;
}

/**
 * Safely parses a decimal Taka string into integer poisha without floating-point math.
 * (e.g., "25000" -> 2500000n, "25000.50" -> 2500050n, "25,000" -> 2500000n)
 */
export function takaStringToPoisha(takaString: string): bigint {
  const cleaned = takaString.replace(/[,\s৳]/g, "").trim();
  if (!cleaned) {
    throw new Error("Invalid Taka string: empty or whitespace");
  }

  const isNegative = cleaned.startsWith("-");
  const unsignedStr = isNegative ? cleaned.slice(1) : cleaned;

  const parts = unsignedStr.split(".");
  if (parts.length > 2) {
    throw new Error(`Invalid Taka string: multiple decimal points in "${takaString}"`);
  }

  const takaPart = parts[0] || "0";
  let poishaPart = parts[1] || "";

  if (poishaPart.length > 2) {
    throw new Error(`Sub-poisha fractions not supported: "${takaString}"`);
  }

  // Pad to exactly 2 digits (e.g., "5" -> "50", "" -> "00")
  poishaPart = poishaPart.padEnd(2, "0");

  const takaBig = BigInt(takaPart);
  const poishaBig = BigInt(poishaPart);

  const total = takaBig * 100n + poishaBig;
  return isNegative ? -total : total;
}

/**
 * Converts a discount percentage (0 to 100, supporting up to 2 decimal places) into integer basis points (0 to 10,000).
 * 1% = 100 bps, 100% = 10,000 bps.
 *
 * Strict Boundaries:
 * - Must be non-negative and <= 100.
 * - Throws RangeError if outside [0, 100].
 * - Throws TypeError if NaN or non-finite.
 */
export function percentToBasisPoints(percentInput: number | string): bigint {
  if (typeof percentInput === "number") {
    if (!Number.isFinite(percentInput) || Number.isNaN(percentInput)) {
      throw new TypeError("Discount percentage must be a finite number");
    }
  }

  const rawStr = typeof percentInput === "number" ? percentInput.toString() : percentInput.trim();
  if (!rawStr) {
    throw new TypeError("Discount percentage cannot be empty");
  }

  if (rawStr.startsWith("-")) {
    throw new RangeError(`Discount percentage cannot be negative: "${rawStr}"`);
  }

  const parts = rawStr.split(".");
  if (parts.length > 2) {
    throw new Error(`Invalid percentage string: "${rawStr}"`);
  }

  if (!/^\d+$/.test(parts[0])) {
    throw new TypeError(`Invalid discount percentage: "${rawStr}"`);
  }

  const intPart = BigInt(parts[0]);
  let fracPart = parts[1] || "";

  if (fracPart.length > 0 && !/^\d+$/.test(fracPart)) {
    throw new TypeError(`Invalid decimal percentage: "${rawStr}"`);
  }

  if (fracPart.length > 2) {
    fracPart = fracPart.slice(0, 2);
  }
  fracPart = fracPart.padEnd(2, "0");

  const bps = intPart * 100n + BigInt(fracPart);

  if (bps > 10000n) {
    throw new RangeError(`Discount percentage cannot exceed 100%: "${rawStr}"`);
  }

  return bps;
}

/**
 * Calculates the discount amount in integer poisha using integer arithmetic and Round Half Up.
 * Formula: round_half_up(basePoisha * basisPoints / 10000)
 *
 * Explicit Boundaries & Invariants:
 * - baseFeePoisha must be non-negative integer poisha (throws RangeError if < 0).
 * - discountPercent must be between 0 and 100 inclusive (throws RangeError otherwise).
 * - Integer Rounding: Uses standard financial Round Half Up: (base * bps + 5000n) / 10000n.
 * - Output is clamped within [0n, baseFeePoisha].
 */
export function calculateDiscountAmountPoisha(
  baseFeeInput: number | bigint | string,
  discountPercentInput: number | string
): bigint {
  const basePoisha = typeof baseFeeInput === "bigint" ? baseFeeInput : BigInt(baseFeeInput);
  if (basePoisha < 0n) {
    throw new RangeError(`Base fee cannot be negative: ${basePoisha}`);
  }
  if (basePoisha === 0n) {
    return 0n;
  }

  const bps = percentToBasisPoints(discountPercentInput);
  if (bps === 0n) {
    return 0n;
  }
  if (bps === 10000n) {
    return basePoisha;
  }

  // Round Half Up integer division:
  // (basePoisha * bps + 5000n) / 10000n
  const discountAmount = (basePoisha * bps + 5000n) / 10000n;

  // Clamping guards
  if (discountAmount > basePoisha) return basePoisha;
  if (discountAmount < 0n) return 0n;
  return discountAmount;
}

/**
 * Calculates net payable fee in integer poisha after applying discount percentage.
 * Formula: baseFeePoisha - calculateDiscountAmountPoisha(baseFeePoisha, discountPercent)
 *
 * Explicit Boundaries & Invariants:
 * - Always returns an integer poisha bigint.
 * - Output is strictly guaranteed within [0n, baseFeePoisha].
 */
export function calculateDiscountedPoisha(
  baseFeeInput: number | bigint | string,
  discountPercentInput: number | string
): bigint {
  const basePoisha = typeof baseFeeInput === "bigint" ? baseFeeInput : BigInt(baseFeeInput);
  const discountAmount = calculateDiscountAmountPoisha(basePoisha, discountPercentInput);
  return basePoisha - discountAmount;
}
