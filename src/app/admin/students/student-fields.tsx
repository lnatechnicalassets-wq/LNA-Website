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
    </div>
  );
}
