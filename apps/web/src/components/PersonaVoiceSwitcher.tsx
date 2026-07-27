"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "~/lib/utils";

export type PersonaVoiceOption = {
  avatar_url?: string;
  description: string;
  display_name: string;
  id: string;
};

export const fallbackPersonaVoiceOptions: PersonaVoiceOption[] = [
  {
    avatar_url: "/agent-sidebar/avatar-4.png",
    description: "Warm, concise portfolio voice agent",
    display_name: "Portfolio Agent",
    id: "portfolio-agent",
  },
  {
    avatar_url: "/agent-sidebar/avatar-1.png",
    description: "Warm reflective confidence-focused persona",
    display_name: "Wife E2E",
    id: "wife-e2e",
  },
  {
    avatar_url: "/design-system/steve-jobs-avatar.png",
    description: "Focused product critique voice",
    display_name: "Steve Jobs",
    id: "steve-jobs",
  },
  {
    avatar_url: "/agent-sidebar/avatar-2.png",
    description: "Direct Cartesia Sonic voice",
    display_name: "Cartesia Voice",
    id: "cartesia-voice",
  },
];

export function PersonaVoiceSwitcher({
  className,
  onSelectPersona,
  personas = fallbackPersonaVoiceOptions,
  selectedPersonaId,
}: {
  className?: string;
  onSelectPersona: (personaId: string) => void;
  personas?: PersonaVoiceOption[];
  selectedPersonaId?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const resolvedPersonaId =
    selectedPersonaId ?? personas[0]?.id ?? "portfolio-agent";
  const selectedPersona =
    personas.find((persona) => persona.id === resolvedPersonaId) ?? personas[0];

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !rootRef.current?.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className={cn("relative", className)} ref={rootRef}>
      <button
        aria-label="Select persona voice"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="flex h-[42px] w-full items-center gap-2 rounded-full border border-[var(--color-border-opaque)] bg-white px-3 text-left shadow-[0_2px_10px_rgba(18,19,24,0.06)]"
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        <span className="relative size-6 shrink-0 overflow-hidden rounded-full bg-[var(--color-background-secondary)]">
          {selectedPersona?.avatar_url ? (
            <img
              alt=""
              className="absolute inset-0 size-full object-cover"
              src={selectedPersona.avatar_url}
            />
          ) : null}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-[var(--color-text-primary)]">
            {selectedPersona?.display_name ?? "Select voice"}
          </span>
          <span className="block truncate text-xs text-[var(--color-text-secondary)]">
            {selectedPersona?.description ?? "Choose a persona voice"}
          </span>
        </span>
        <ChevronDown className="size-4 shrink-0 text-[var(--color-text-secondary)]" />
      </button>

      {isOpen ? (
        <div
          className="absolute bottom-full left-0 z-20 mb-2 w-full min-w-[280px] rounded-[12px] border border-[var(--color-border-opaque)] bg-white p-2 shadow-[0_18px_44px_rgba(18,19,24,0.16)]"
          role="listbox"
        >
          {personas.map((persona) => {
            const selected = persona.id === resolvedPersonaId;

            return (
              <button
                aria-selected={selected}
                className={cn(
                  "flex w-full items-center gap-3 rounded-[8px] px-3 py-2 text-left transition hover:bg-[var(--color-background-secondary)]",
                  selected && "bg-[var(--color-background-secondary)]",
                )}
                key={persona.id}
                onClick={() => {
                  onSelectPersona(persona.id);
                  setIsOpen(false);
                }}
                role="option"
                type="button"
              >
                <span className="relative size-8 shrink-0 overflow-hidden rounded-full bg-[var(--color-background-secondary)]">
                  {persona.avatar_url ? (
                    <img
                      alt=""
                      className="absolute inset-0 size-full object-cover"
                      src={persona.avatar_url}
                    />
                  ) : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-[var(--color-text-primary)]">
                    {persona.display_name}
                  </span>
                  <span className="block truncate text-xs text-[var(--color-text-secondary)]">
                    {persona.description}
                  </span>
                </span>
                {selected ? (
                  <Check className="size-4 shrink-0 text-[var(--color-core-primary-a)]" />
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
