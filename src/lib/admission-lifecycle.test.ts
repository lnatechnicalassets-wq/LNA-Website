import { describe, expect, it } from "vitest";
import { lifecycleInputSchema } from "./admission-lifecycle";

const id = "e2600000-0000-4000-8000-000000000001";
const destination = "e2600000-0000-4000-8000-000000000002";
const revision = "2026-11-28T12:00:00+00:00";
const valid = {
  id,
  revision,
  operation: "cancel",
  reason: "  Student request  ",
  attested: "yes",
  destination: "",
};

describe("admission lifecycle input", () => {
  it("requires a trimmed cancellation reason and explicit attestation", () => {
    expect(lifecycleInputSchema.parse(valid).reason).toBe("Student request");
    expect(lifecycleInputSchema.safeParse({ ...valid, reason: " " }).success).toBe(false);
    expect(lifecycleInputSchema.safeParse({ ...valid, attested: null }).success).toBe(false);
  });
  it("requires an exact destination identity and revision for transfer", () => {
    expect(lifecycleInputSchema.safeParse({ ...valid, operation: "transfer" }).success).toBe(false);
    expect(
      lifecycleInputSchema.parse({
        ...valid,
        operation: "transfer",
        destination: `${destination}|${revision}`,
      })
    ).toMatchObject({ destination: { id: destination, revision } });
    expect(
      lifecycleInputSchema.safeParse({
        ...valid,
        operation: "transfer",
        destination: `${destination}|${revision}|extra`,
      }).success
    ).toBe(false);
    expect(
      lifecycleInputSchema.safeParse({ ...valid, destination: `${destination}|${revision}` })
        .success
    ).toBe(false);
  });
});
