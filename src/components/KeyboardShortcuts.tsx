"use client";

import { X } from "lucide-react";
import { useState, useEffect } from "react";
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
    <Card className="fixed bottom-4 right-4 z-50 w-80 bg-white shadow-lg dark:bg-gray-900">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xl font-bold">
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
            className="flex items-center justify-between border-t border-gray-200 py-3 dark:border-gray-700"
          >
            <span className="text-gray-700 dark:text-gray-300">
              {shortcut.action}
            </span>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded border border-gray-300 dark:border-gray-600">
              {shortcut.key}
            </span>
          </div>
        ))}
        <div className="mt-4 flex justify-end">
          <Button
            variant="outline"
            className="rounded-full border-gray-300 bg-white px-6 py-2 text-gray-800 hover:bg-gray-100"
          >
            Get app
          </Button>
        </div>
      </CardContent>
    </Card>
  ) : null;
}
