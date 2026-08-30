import type { ComponentProps } from "react";

export function Separator({ className = "", ...props }: ComponentProps<"hr">) {
  return <hr className={`orbit-separator ${className}`} {...props} />;
}
