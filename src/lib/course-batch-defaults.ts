import { z } from "zod";
import { bdtStringToPoisha, poishaToTakaString } from "@/lib/money";

const poisha = z
  .string()
  .regex(/^\d{1,16}$/)
  .refine((value) => /^\d{1,16}$/.test(value) && BigInt(value) <= BigInt(Number.MAX_SAFE_INTEGER));
export const courseBatchDefaultsSchema = z
  .object({
    venue: z.string().trim().min(3).max(240),
    schedule_description: z.string().trim().min(5).max(2000),
    capacity: z.number().int().positive().max(2147483647).nullable(),
    fee_poisha: poisha,
    discount_fee_poisha: poisha.nullable(),
  })
  .refine(
    (value) =>
      value.discount_fee_poisha === null ||
      (/^\d{1,16}$/.test(value.discount_fee_poisha) &&
        /^\d{1,16}$/.test(value.fee_poisha) &&
        BigInt(value.discount_fee_poisha) <= BigInt(value.fee_poisha))
  );
export type CourseBatchDefaults = z.infer<typeof courseBatchDefaultsSchema>;

export function parseCourseBatchDefaults(form: FormData): CourseBatchDefaults | null {
  const read = (key: string) => {
    const value = form.get(key);
    return typeof value === "string" ? value.trim() : "";
  };
  const fee = read("fee_poisha");
  const discount = read("discount_fee_poisha");
  const capacity = read("capacity");
  if (
    !/^\d{1,14}(?:\.\d{1,2})?$/.test(fee) ||
    (discount && !/^\d{1,14}(?:\.\d{1,2})?$/.test(discount)) ||
    (capacity !== "unlimited" && !/^[1-9]\d{0,9}$/.test(capacity))
  )
    return null;
  const parsed = courseBatchDefaultsSchema.safeParse({
    venue: read("venue"),
    schedule_description: read("schedule_description"),
    capacity: capacity === "unlimited" ? null : Number(capacity),
    fee_poisha: String(bdtStringToPoisha(fee)),
    discount_fee_poisha: discount ? String(bdtStringToPoisha(discount)) : null,
  });
  return parsed.success ? parsed.data : null;
}

export function batchDefaultsValues(defaults: CourseBatchDefaults): Record<string, string> {
  return {
    venue: defaults.venue,
    schedule_description: defaults.schedule_description,
    capacity: defaults.capacity === null ? "unlimited" : String(defaults.capacity),
    fee_poisha: poishaToTakaString(defaults.fee_poisha),
    discount_fee_poisha:
      defaults.discount_fee_poisha === null ? "" : poishaToTakaString(defaults.discount_fee_poisha),
  };
}
