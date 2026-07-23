"use client";

import { DialRoot } from "dialkit";
import type { DialMode, DialPosition, DialTheme } from "dialkit";
import { useEffect, useState } from "react";

import { cn } from "~/lib/utils";

type DialKitRootProps = {
  className?: string;
  defaultOpen?: boolean;
  mode?: DialMode;
  position?: DialPosition;
  theme?: DialTheme;
};

function isDialKitEnabled() {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.NEXT_PUBLIC_DIALKIT_ENABLED === "true"
  );
}

export function DialKitRoot({
  className,
  defaultOpen,
  mode = "popover",
  position,
  theme = "system",
}: DialKitRootProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isDialKitEnabled()) {
    return null;
  }

  if (mode !== "inline") {
    return (
      <DialRoot
        defaultOpen={defaultOpen}
        position={position}
        productionEnabled
        theme={theme}
      />
    );
  }

  return (
    <aside
      className={cn(
        "fixed right-4 top-4 z-[9999] h-[348px] w-[280px] overflow-hidden",
        className,
      )}
    >
      <DialRoot
        defaultOpen={defaultOpen}
        mode="inline"
        position={position}
        productionEnabled
        theme={theme}
      />
    </aside>
  );
}
