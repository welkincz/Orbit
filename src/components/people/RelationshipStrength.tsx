import type { RelationshipStrength as RelationshipStrengthValue } from "@/types/person";

interface RelationshipStrengthProps {
  value?: RelationshipStrengthValue;
  /** `compact` drops the printed value where the rail already sorts by strength. */
  variant?: "labelled" | "compact";
}

export function RelationshipStrength({ value, variant = "labelled" }: RelationshipStrengthProps) {
  if (!value) return <span>Not set</span>;

  return (
    <span className="strength-meter" aria-label={`${value} of 5`}>
      <span className="sr-only">{value} of 5</span>
      <span aria-hidden="true" className="strength-meter__steps">
        {Array.from({ length: 5 }, (_, index) => (
          <span
            className="strength-meter__step"
            data-active={index < value ? "true" : undefined}
            key={index}
          />
        ))}
      </span>
      {variant === "labelled" && (
        <span aria-hidden="true" className="strength-meter__value tabular">{value}/5</span>
      )}
    </span>
  );
}
