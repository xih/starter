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
    <Card className="fixed bottom-4 right-4 z-50 hidden w-80 bg-card shadow-lg lg:block">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xl font-bold text-card-foreground">
          Introducing keyboard shortcuts!
        </CardTitle>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setIsVisible(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="pt-0">
        {shortcuts.map((shortcut, index) => (
          <div
            key={index}
            className="flex items-center justify-between border-t border-border py-3"
          >
            <span className="text-muted-foreground">{shortcut.action}</span>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded border border-border">
              {shortcut.key}
            </span>
          </div>
        ))}
        <div className="mt-4 flex justify-end">
          <Button variant="outline" className="rounded-full px-6 py-2">
            Get app
          </Button>
        </div>
      </CardContent>
    </Card>
  ) : null;
}
