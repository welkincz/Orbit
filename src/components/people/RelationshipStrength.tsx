import type { RelationshipStrength as RelationshipStrengthValue } from "@/types/person";

interface RelationshipStrengthProps {
  value?: RelationshipStrengthValue;
}

export function RelationshipStrength({ value }: RelationshipStrengthProps) {
  if (!value) return <span className="text-sm text-slate-500">Not set</span>;

  return (
    <span className="inline-flex items-center gap-1" aria-label={`${value} of 5`}>
      <span className="sr-only">{value} of 5</span>
      {Array.from({ length: 5 }, (_, index) => (
        <span
          aria-hidden="true"
          className={`h-1.5 w-3 rounded-full ${index < value ? "bg-slate-900" : "bg-slate-200"}`}
          key={index}
        />
      ))}
    </span>
  );
}
