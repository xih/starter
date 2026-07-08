import { Check } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";
import { useState } from "react";

import { cn } from "../../utils";

export type CheckboxProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "aria-checked" | "role" | "type"
> & {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
};

export function Checkbox({
  checked,
  className,
  defaultChecked = false,
  disabled,
  onCheckedChange,
  onClick,
  ...props
}: CheckboxProps) {
  const [internalChecked, setInternalChecked] = useState(defaultChecked);
  const isControlled = typeof checked === "boolean";
  const resolvedChecked = isControlled ? checked : internalChecked;

  return (
    <button
      aria-checked={resolvedChecked}
      className={cn(
        "flex size-[24px] items-center justify-center rounded-[3px] border border-[#d9d9d9] bg-white text-white transition focus-visible:ring-2 focus-visible:ring-[#121318] focus-visible:ring-offset-2 focus-visible:outline-none",
        resolvedChecked && "border-[#121318] bg-[#121318]",
        disabled && "cursor-not-allowed opacity-45",
        className,
      )}
      disabled={disabled}
      onClick={(event) => {
        const nextChecked = !resolvedChecked;
        if (!isControlled) {
          setInternalChecked(nextChecked);
        }
        onCheckedChange?.(nextChecked);
        onClick?.(event);
      }}
      role="checkbox"
      type="button"
      {...props}
    >
      {resolvedChecked ? (
        <Check className="size-[16px]" strokeWidth={3} />
      ) : null}
    </button>
  );
}
