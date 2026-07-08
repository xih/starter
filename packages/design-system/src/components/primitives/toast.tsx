import { Bookmark } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "../../utils";

export type ToastState = "neutral" | "error" | "success";

export type ToastProps = HTMLAttributes<HTMLDivElement> & {
  children?: ReactNode;
  state?: ToastState;
};

const toastClass = {
  neutral: "bg-[#b8b8ba] text-[#121318]",
  error: "bg-[#c9002b] text-white",
  success: "bg-[#128b49] text-white",
} satisfies Record<ToastState, string>;

export function Toast({
  children = "Toast Message",
  className,
  state = "neutral",
  ...props
}: ToastProps) {
  return (
    <div
      className={cn(
        "font-body flex h-[42px] w-[316px] items-center gap-[12px] rounded-[7px] px-[16px] text-[14px] leading-[20px] font-[400]",
        toastClass[state],
        className,
      )}
      data-state={state}
      role={state === "error" ? "alert" : "status"}
      {...props}
    >
      <Bookmark className="size-[16px] fill-current" />
      <span>{children}</span>
    </div>
  );
}
