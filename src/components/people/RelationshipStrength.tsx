import type { RelationshipStrength as RelationshipStrengthValue } from "@/types/person";

interface RelationshipStrengthProps {
  value?: RelationshipStrengthValue;
}

export function RelationshipStrength({ value }: RelationshipStrengthProps) {
  if (!value) return <span>Not set</span>;

  return (
    <span className="strength-meter" aria-label={`${value} of 5`}>
      <span className="sr-only">{value} of 5</span>
      {Array.from({ length: 5 }, (_, index) => (
        <span
          aria-hidden="true"
          className="strength-meter__step"
          data-active={index < value ? "true" : undefined}
          key={index}
        />
      ))}
    </span>
  );
}
