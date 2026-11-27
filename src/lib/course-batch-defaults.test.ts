import { describe, expect, it } from "vitest";
import { batchDefaultsValues, parseCourseBatchDefaults } from "./course-batch-defaults";

function makeForm(overrides: Record<string, string> = {}) {
  const form = new FormData();
  for (const [key, value] of Object.entries({
    venue: "Dhaka",
    schedule_description: "Weekend sessions",
    capacity: "unlimited",
    fee_poisha: "1234.50",
    discount_fee_poisha: "1000.25",
    ...overrides,
  }))
    form.set(key, value);
  return form;
}
describe("course batch defaults", () => {
  it("round trips exact money and unlimited capacity without copying dates or identity", () => {
    const defaults = parseCourseBatchDefaults(
      makeForm({ start_date: "2099-01-01", batch_number: "9" })
    );
    expect(defaults).toEqual({
      venue: "Dhaka",
      schedule_description: "Weekend sessions",
      capacity: null,
      fee_poisha: "123450",
      discount_fee_poisha: "100025",
    });
    expect(batchDefaultsValues(defaults!)).toEqual({
      venue: "Dhaka",
      schedule_description: "Weekend sessions",
      capacity: "unlimited",
      fee_poisha: "1234.50",
      discount_fee_poisha: "1000.25",
    });
  });
  it("rejects bad capacity, price and discount", () => {
    expect(parseCourseBatchDefaults(makeForm({ capacity: "0" }))).toBeNull();
    expect(parseCourseBatchDefaults(makeForm({ fee_poisha: "1e5" }))).toBeNull();
    expect(parseCourseBatchDefaults(makeForm({ discount_fee_poisha: "9999" }))).toBeNull();
  });
});
