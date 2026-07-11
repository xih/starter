"use client";

import { DialRoot } from "dialkit";
import { useEffect, useState } from "react";

export function DialKitRoot() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <aside className="fixed right-4 top-4 z-[9999] h-[348px] w-[280px] overflow-hidden">
      <DialRoot mode="inline" theme="dark" productionEnabled />
    </aside>
  );
}
