import { WarningCircle } from "@phosphor-icons/react";

export function UploadErrors({ errors }: { errors: string[] }) {
  if (errors.length === 0) return null;

  return (
    <div className="mt-4 border-l-4 border-negative bg-negative-tint px-4 py-3">
      <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-negative">
        <WarningCircle size={16} weight="fill" />
        {errors.length === 1 ? "1 problem found" : `${errors.length} problems found`}
      </p>
      <ul className="max-h-40 space-y-1 overflow-y-auto font-mono text-xs text-ink/70">
        {errors.map((e, i) => (
          <li key={i}>{e}</li>
        ))}
      </ul>
    </div>
  );
}
