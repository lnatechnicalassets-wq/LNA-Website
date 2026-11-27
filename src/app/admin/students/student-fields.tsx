import { peopleCopy as copy, peopleFieldClass } from "@/lib/admin-people";

export function StudentFields({
  profile,
}: {
  profile?: { full_name: string; email: string; phone: string; university: string | null };
}) {
  const fields = [
    {
      name: "fullName",
      label: copy.name,
      type: "text",
      value: profile?.full_name,
      required: true,
      max: 120,
    },
    {
      name: "email",
      label: copy.email,
      type: "email",
      value: profile?.email,
      required: true,
      max: 160,
    },
    {
      name: "phone",
      label: copy.phone,
      type: "tel",
      value: profile?.phone,
      required: true,
      max: 24,
    },
    {
      name: "university",
      label: copy.university,
      type: "text",
      value: profile?.university,
      required: false,
      max: 200,
    },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {fields.map(({ name, label, type, value, required, max }) => (
        <label key={name} className="block space-y-1 text-sm font-medium">
          <span>{label}</span>
          <input
            name={name}
            type={type}
            required={required}
            maxLength={max}
            defaultValue={value ?? ""}
            className={peopleFieldClass}
          />
        </label>
      ))}
      {profile && (
        <div className="space-y-3 sm:col-span-2">
          <label className="block space-y-1 text-sm font-medium">
            <span>Reason for correction</span>
            <textarea
              name="reason"
              required
              maxLength={500}
              rows={2}
              className={peopleFieldClass}
            />
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="attested" required />
            <span>
              I verified that the new contact details belong to this student. Older application
              recovery links will become invalid.
            </span>
          </label>
          <p className="text-xs text-text-secondary">
            Existing admission and sent email records remain unchanged. Correct the affected
            admissions separately if needed.
          </p>
        </div>
      )}
    </div>
  );
}
