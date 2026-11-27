import { describe, expect, it } from "vitest";
import { isBatchIntakeAllowed } from "./batch-intake";

const now = Date.parse("2026-11-28T12:00:00Z");
const past = "2026-11-27T12:00:00Z";
const future = "2026-11-29T12:00:00Z";

describe("batch intake", () => {
  it("keeps legacy windows until staff configure a switch", () => {
    expect(isBatchIntakeAllowed({ status: "open_for_enrollment" }, false, now)).toBe(true);
    expect(
      isBatchIntakeAllowed({ status: "open_for_enrollment", closesAt: past }, false, now)
    ).toBe(false);
    expect(
      isBatchIntakeAllowed({ status: "open_for_enrollment", opensAt: future }, true, now)
    ).toBe(false);
    expect(isBatchIntakeAllowed({ status: "upcoming" }, true, now)).toBe(false);
  });

  it("allows manual public intake independently of legacy dates", () => {
    for (const status of ["upcoming", "in_progress"]) {
      expect(
        isBatchIntakeAllowed({ status, acceptApplications: true, closesAt: past }, false, now)
      ).toBe(true);
    }
  });

  it("allows staff intake with the public switch off", () => {
    const batch = { status: "upcoming", acceptApplications: false, closesAt: past };
    expect(isBatchIntakeAllowed(batch, false, now)).toBe(false);
    expect(isBatchIntakeAllowed(batch, true, now)).toBe(true);
  });

  it("never treats a draft, completed, cancelled or archived batch as eligible", () => {
    for (const status of ["draft", "completed", "cancelled", "archived"]) {
      expect(isBatchIntakeAllowed({ status, acceptApplications: true }, false, now)).toBe(false);
      expect(isBatchIntakeAllowed({ status, acceptApplications: true }, true, now)).toBe(false);
    }
    expect(
      isBatchIntakeAllowed(
        { status: "upcoming", acceptApplications: true, archivedAt: past },
        true,
        now
      )
    ).toBe(false);
  });
});
