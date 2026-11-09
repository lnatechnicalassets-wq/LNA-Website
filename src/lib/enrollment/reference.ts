/**
 * Crockford Base32 Application Reference Generator
 * Per Rule R8, Blueprint Part 5, and SRS FR-ENR-002.
 * Generates human-friendly, unguessable references in the format: LNA-XXXX-XXXX
 */
const CROCKFORD_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export function generateEnrollmentReference(): string {
  let seg1 = "";
  let seg2 = "";

  for (let i = 0; i < 4; i++) {
    const r1 = Math.floor(Math.random() * CROCKFORD_ALPHABET.length);
    const r2 = Math.floor(Math.random() * CROCKFORD_ALPHABET.length);
    seg1 += CROCKFORD_ALPHABET[r1];
    seg2 += CROCKFORD_ALPHABET[r2];
  }

  return `LNA-${seg1}-${seg2}`;
}
