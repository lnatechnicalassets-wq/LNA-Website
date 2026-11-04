/**
 * Money utilities conforming to Rule R5:
 * Integer poisha only (1 BDT = 100 poisha).
 * Zero floating-point arithmetic. Zero parseFloat(), Number(), or .toFixed().
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

