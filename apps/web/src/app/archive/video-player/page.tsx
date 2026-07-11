import { AppSidebar } from "~/components/Sidebar";
import { VideoPlayer } from "~/components/VideoPlayer";
import { KeyboardShortcuts } from "~/components/KeyboardShortcuts";
import { type CSSProperties } from "react";
import { lightTokens } from "@starter/tokens";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "~/components/ui/sidebar";

const lightTokenVars = Object.fromEntries(
  lightTokens
    .filter(
      (token): token is { name: string; value: string } =>
        typeof token === "object" &&
        token !== null &&
        "name" in token &&
        "value" in token &&
        typeof token.name === "string" &&
        typeof token.value === "string",
    )
    .map((token) => [`--${token.name}`, token.value]),
) as CSSProperties;

const archiveTheme = {
  ...lightTokenVars,
  "--background": "var(--color-background-primary)",
  "--foreground": "var(--color-text-primary)",
  "--card": "var(--color-background-primary)",
  "--card-foreground": "var(--color-text-primary)",
  "--popover": "var(--color-background-primary)",
  "--popover-foreground": "var(--color-text-primary)",
  "--primary": "var(--color-core-primary-a)",
  "--primary-foreground": "var(--color-text-inverse-primary)",
  "--secondary": "var(--color-background-secondary)",
  "--secondary-foreground": "var(--color-text-primary)",
  "--muted": "var(--color-background-secondary)",
  "--muted-foreground": "var(--color-text-secondary)",
  "--accent": "var(--color-background-hovered)",
  "--accent-foreground": "var(--color-text-primary)",
  "--destructive": "var(--color-state-errored)",
  "--destructive-foreground": "var(--color-text-inverse-primary)",
  "--border": "var(--color-border-opaque)",
  "--input": "var(--color-border-opaque)",
  "--ring": "var(--color-border-selected)",
  "--sidebar-background": "var(--color-background-primary)",
  "--sidebar-foreground": "var(--color-text-primary)",
  "--sidebar-primary": "var(--color-core-primary-a)",
  "--sidebar-primary-foreground": "var(--color-text-inverse-primary)",
  "--sidebar-accent": "var(--color-background-secondary)",
  "--sidebar-accent-foreground": "var(--color-text-primary)",
  "--sidebar-border": "var(--color-border-opaque)",
  "--sidebar-ring": "var(--color-border-selected)",
} as CSSProperties;

export default function ArchivedVideoPlayerPage() {
  return (
    <SidebarProvider
      className="bg-[var(--color-background-secondary)] font-body text-[var(--color-text-primary)]"
      style={archiveTheme}
    >
      <AppSidebar />
      <SidebarInset className="overflow-hidden">
        <header className="flex h-14 shrink-0 items-center border-b border-[var(--color-border-opaque)] bg-[var(--color-background-primary)] px-token-16 text-[var(--color-text-primary)] md:hidden">
          <SidebarTrigger />
          <span className="ml-token-8 text-body font-semibold">
            Application
          </span>
        </header>
        <div className="relative flex min-h-0 flex-1 overflow-hidden bg-[var(--color-background-secondary)]">
          <VideoPlayer />
        </div>
        <KeyboardShortcuts />
      </SidebarInset>
    </SidebarProvider>
  );
}
