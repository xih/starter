"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";

export function KeyboardShortcuts() {
  const [isVisible, setIsVisible] = useState(true);

  const shortcuts = [
    { action: "Go to previous video", key: "↑" },
    { action: "Go to next video", key: "↓" },
    { action: "Like video", key: "L" },
    { action: "Mute / unmute video", key: "M" },
  ];

  return isVisible ? (
    <Card className="fixed bottom-token-16 right-token-16 z-50 hidden w-80 border-[var(--color-border-opaque)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)] shadow-lg lg:block">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-heading font-body font-semibold text-[var(--color-text-primary)]">
          Introducing keyboard shortcuts!
        </CardTitle>
        <Button
          variant="ghost"
          size="icon"
          className="h-token-32 w-token-32 text-[var(--color-text-secondary)] hover:bg-[var(--color-background-hovered)] hover:text-[var(--color-text-primary)]"
          onClick={() => setIsVisible(false)}
          aria-label="Dismiss keyboard shortcuts"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="pt-0">
        {shortcuts.map((shortcut, index) => (
          <div
            key={index}
            className="flex items-center justify-between border-t border-[var(--color-border-opaque)] py-token-12"
          >
            <span className="font-body text-body text-[var(--color-text-secondary)]">
              {shortcut.action}
            </span>
            <span className="inline-flex h-token-32 w-token-32 items-center justify-center rounded-token-xxs border border-[var(--color-border-opaque)] bg-[var(--color-background-secondary)] font-body text-body text-[var(--color-text-primary)]">
              {shortcut.key}
            </span>
          </div>
        ))}
        <div className="mt-4 flex justify-end">
          <Button
            variant="outline"
            className="rounded-token-round border-[var(--color-border-opaque)] bg-[var(--color-background-primary)] px-token-24 py-token-8 font-body text-body text-[var(--color-text-primary)] hover:bg-[var(--color-background-hovered)]"
          >
            Get app
          </Button>
        </div>
      </CardContent>
    </Card>
  ) : null;
}
