"use client";

import type React from "react";

import { useRef, useState, useEffect } from "react";
import { cn } from "~/lib/utils";
import { ArrowUp, Paperclip, Square, X } from "lucide-react";
import { Button } from "~/components/ui/button";
import "./rainbow-effect.css";

interface RainbowPromptInputProps {
  className?: string;
  placeholder?: string;
  rainbowActive?: boolean;
  onRainbowToggle?: (active: boolean) => void;
  rainbowColor?: string;
  onSubmit?: (value: string, files: File[]) => void;
}

export function RainbowPromptInput({
  className,
  placeholder = "Ask me anything...",
  rainbowActive = false,
  onRainbowToggle,
  rainbowColor,
  onSubmit,
}: RainbowPromptInputProps) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [aspectRatio, setAspectRatio] = useState(1);
  const [isRainbowActive, setIsRainbowActive] = useState(rainbowActive);
  const containerRef = useRef<HTMLDivElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  // Update internal state when prop changes
  useEffect(() => {
    setIsRainbowActive(rainbowActive);
  }, [rainbowActive]);

  // Calculate aspect ratio for the rainbow effect
  useEffect(() => {
    if (containerRef.current) {
      setAspectRatio(
        containerRef.current.clientWidth / containerRef.current.clientHeight,
      );
    }
  }, []);

  const handleSubmit = () => {
    if (input.trim() || files.length > 0) {
      setIsLoading(true);

      if (onSubmit) {
        onSubmit(input, files);
      }

      // Simulate loading for demo purposes
      setTimeout(() => {
        setIsLoading(false);
        setInput("");
        setFiles([]);
      }, 2000);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files);
      setFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    if (uploadInputRef?.current) {
      uploadInputRef.current.value = "";
    }
  };

  const toggleRainbow = () => {
    const newState = !isRainbowActive;
    setIsRainbowActive(newState);
    if (onRainbowToggle) {
      onRainbowToggle(newState);
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "rainbow-container",
        isRainbowActive && "rainbow-active",
        className,
      )}
      style={{
        ["--rainbow-aspect-ratio" as string]: aspectRatio,
        ...(rainbowColor
          ? { ["--rainbow-color-disco" as string]: rainbowColor }
          : {}),
      }}
    >
      <div className="rainbow-content p-4">
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2 pb-2">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-sm"
              >
                <Paperclip className="size-4" />
                <span className="max-w-[120px] truncate">{file.name}</span>
                <button
                  onClick={() => handleRemoveFile(index)}
                  className="rounded-full p-1 hover:bg-secondary/50"
                  type="button"
                >
                  <X className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isLoading ? "Uploading..." : placeholder}
          className="min-h-[80px] w-full resize-none bg-transparent outline-none"
          rows={3}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          disabled={isLoading}
        />

        <div className="flex items-center justify-between gap-2 pt-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-2xl hover:bg-secondary-foreground/10">
              <label
                htmlFor="file-upload"
                className="flex h-8 w-8 cursor-pointer items-center justify-center"
              >
                <input
                  ref={uploadInputRef}
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <Paperclip className="size-5 text-primary" />
              </label>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={toggleRainbow}
              className={cn("text-xs", isRainbowActive && "bg-secondary")}
            >
              {isRainbowActive ? "Rainbow On" : "Rainbow Off"}
            </Button>
          </div>

          <Button
            variant="default"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={handleSubmit}
            disabled={isLoading || (!input.trim() && files.length === 0)}
          >
            {isLoading ? (
              <Square className="size-5 fill-current" />
            ) : (
              <ArrowUp className="size-5" />
            )}
          </Button>
        </div>
      </div>
      <span aria-hidden className="rainbow-disco" />
    </div>
  );
}
