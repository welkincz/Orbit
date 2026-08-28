import type { ComponentProps } from "react";

export function Separator({ className = "", ...props }: ComponentProps<"hr">) {
  return <hr className={`border-0 border-t border-slate-200 ${className}`} {...props} />;
}
