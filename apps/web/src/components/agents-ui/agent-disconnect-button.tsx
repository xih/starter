"use client";

import type { ComponentProps, MouseEvent, ReactNode } from "react";
import type { VariantProps } from "class-variance-authority";
import { useSessionContext } from "@livekit/components-react";
import { PhoneOffIcon } from "lucide-react";

import { Button } from "~/components/ui/button";
import type { buttonVariants } from "~/components/ui/button";
import { cn } from "~/lib/utils";

export interface AgentDisconnectButtonProps
  extends ComponentProps<"button">, VariantProps<typeof buttonVariants> {
  icon?: ReactNode;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "outline" | "destructive" | "ghost" | "link";
  children?: ReactNode;
}

export function AgentDisconnectButton({
  icon,
  size = "default",
  variant = "destructive",
  children,
  onClick,
  ...props
}: AgentDisconnectButtonProps) {
  const { end } = useSessionContext();
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (typeof end === "function") {
      void end();
    }
  };

  return (
    <Button size={size} variant={variant} onClick={handleClick} {...props}>
      {icon ?? <PhoneOffIcon />}
      {children ?? (
        <span className={cn(size?.includes("icon") && "sr-only")}>
          END CALL
        </span>
      )}
    </Button>
  );
}
