import { X } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "../../utils";

export type DesignSystemButtonType = "primary" | "secondary" | "tertiary";
export type DesignSystemButtonSize = "large" | "small";
export type DesignSystemButtonState =
  | "default"
  | "hovered"
  | "selected"
  | "disabled";

export type DesignSystemButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "type"
> & {
  buttonType?: DesignSystemButtonType;
  children?: ReactNode;
  htmlType?: ButtonHTMLAttributes<HTMLButtonElement>["type"];
  showIcon?: boolean;
  size?: DesignSystemButtonSize;
  state?: DesignSystemButtonState;
};

const buttonTypeClass = {
  primary: {
    default: "border-transparent bg-[#f2f2f2] text-[#121318]",
    hovered: "border-transparent bg-[#e8e8e8] text-[#121318]",
    selected: "border-transparent bg-[#d8d8d8] text-[#121318]",
    disabled: "border-transparent bg-[#626368] text-[#393a3e]",
  },
  secondary: {
    default: "border-[#dfdfdf] bg-white text-[#121318]",
    hovered: "border-[#d4d4d4] bg-[#f5f5f5] text-[#121318]",
    selected: "border-transparent bg-[#dcdcdc] text-[#121318]",
    disabled: "border-[#eeeeee] bg-white text-[#8c8d90]",
  },
  tertiary: {
    default: "border-transparent bg-transparent text-[#121318]",
    hovered: "border-transparent bg-[#f2f2f2] text-[#121318]",
    selected: "border-transparent bg-[#dcdcdc] text-[#121318]",
    disabled: "border-transparent bg-transparent text-[#8c8d90]",
  },
} satisfies Record<
  DesignSystemButtonType,
  Record<DesignSystemButtonState, string>
>;

export function DesignSystemButton({
  buttonType = "primary",
  children = "Button",
  className,
  disabled,
  htmlType = "button",
  showIcon = true,
  size = "large",
  state = disabled ? "disabled" : "default",
  ...props
}: DesignSystemButtonProps) {
  const isDisabled = disabled || state === "disabled";

  return (
    <button
      className={cn(
        "font-body inline-flex shrink-0 items-center justify-center gap-[10px] rounded-[8px] border text-[14px] leading-[20px] font-[700] transition focus-visible:ring-2 focus-visible:ring-[#121318] focus-visible:ring-offset-2 focus-visible:outline-none",
        size === "large"
          ? "h-[52px] w-[354px] px-[24px]"
          : "h-[36px] w-[100px] px-[12px]",
        buttonTypeClass[buttonType][state],
        isDisabled && "cursor-not-allowed",
        className,
      )}
      data-size={size}
      data-state={state}
      data-type={buttonType}
      disabled={isDisabled}
      type={htmlType}
      {...props}
    >
      {showIcon ? (
        <span
          className={cn(
            "flex size-[16px] items-center justify-center rounded-[4px]",
            state === "disabled"
              ? "bg-[#8d8e91] text-[#f4f4f4]"
              : "bg-[#121318] text-white",
          )}
        >
          <X className="size-[12px]" strokeWidth={3} />
        </span>
      ) : null}
      <span>{children}</span>
    </button>
  );
}
