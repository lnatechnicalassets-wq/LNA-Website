// Copy configuration only. New batch identity, dates and operational state are never inherited.
export function batchCopyValues(
  courseId: string,
  source: Record<string, string>
): Record<string, string> {
  return {
    course_id: courseId,
    venue: source.venue ?? "",
    schedule_description: source.schedule_description ?? "",
    capacity: source.capacity ?? "",
    fee_poisha: source.fee_poisha ?? "",
    discount_fee_poisha: source.discount_fee_poisha ?? "",
  };
}
