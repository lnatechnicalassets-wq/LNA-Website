import { describe, it, expect } from "vitest";
import { generateEnrollmentReference } from "./reference";

describe("generateEnrollmentReference", () => {
  it("generates references matching the Crockford Base32 LNA-XXXX-XXXX pattern", () => {
    const ref = generateEnrollmentReference();
    expect(ref).toMatch(/^LNA-[0-9A-HJKMNP-Z]{4}-[0-9A-HJKMNP-Z]{4}$/);
  });

  it("generates unique references across consecutive calls", () => {
    const refs = new Set<string>();
    for (let i = 0; i < 50; i++) {
      refs.add(generateEnrollmentReference());
    }
    expect(refs.size).toBe(50);
  });
});

