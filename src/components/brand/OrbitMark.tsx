interface OrbitMarkProps {
  className?: string;
}

/**
 * The header mark is a miniature of what the canvas already draws: a core with
 * one body in orbit around it, positioned where the self anchor carries its
 * beacon. Colours come from theme tokens, so it turns over with the map instead
 * of sitting on top of it as separate branding.
 *
 * Inline SVG on purpose. No icon package, no sprite, no network request.
 */
export function OrbitMark({ className }: OrbitMarkProps) {
  return (
    <svg
      aria-hidden="true"
      className={className ? `orbit-mark ${className}` : "orbit-mark"}
      fill="none"
      focusable="false"
      viewBox="0 0 16 16"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        cx="8"
        cy="8"
        r="5.6"
        stroke="var(--mark-ring)"
        strokeWidth="1.1"
      />
      <circle cx="8" cy="8" r="2.9" fill="var(--mark-core)" />
      {/* The knockout stroke lets the ring read as passing behind the body. */}
      <circle
        cx="11.95"
        cy="4.05"
        r="1.7"
        fill="var(--mark-accent)"
        stroke="var(--header)"
        strokeWidth="1.2"
      />
    </svg>
  );
}
