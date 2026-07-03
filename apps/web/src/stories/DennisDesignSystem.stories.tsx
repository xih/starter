import {
  Check,
  ChevronDown,
  CircleAlert,
  CircleCheck,
  Mic,
  Settings2,
} from "lucide-react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { ReactNode } from "react";

const colorTokens = [
  "--color-background-primary",
  "--color-background-secondary",
  "--color-bg-app",
  "--color-bg-primary",
  "--color-bg-secondary",
  "--color-text-primary",
  "--color-text-secondary",
  "--color-text-inverse-primary",
  "--color-border-subtle",
  "--color-border-opaque",
  "--color-border-selected",
  "--color-core-primary-a",
  "--color-core-accent",
  "--color-state-errored",
  "--color-state-success",
  "--color-state-warning",
];

const typeRows = [
  [
    "Hero",
    "font-title text-[48px] leading-[52.8px] tracking-[var(--font-letter-spacing-title)]",
  ],
  [
    "Display",
    "font-title text-[36px] leading-[40px] tracking-[var(--font-letter-spacing-title)]",
  ],
  [
    "Title",
    "font-title text-[length:var(--font-font-size-title)] leading-[var(--font-line-height-lh-title)] tracking-[var(--font-letter-spacing-title)]",
  ],
  [
    "Heading",
    "font-body text-[length:var(--font-font-size-heading)] font-[var(--font-font-weight-semi-bold)] leading-[var(--font-line-height-lh-heading)]",
  ],
  [
    "Body",
    "font-body text-[length:var(--font-font-size-body)] leading-[var(--font-line-height-lh-body)]",
  ],
  [
    "Caption",
    "font-body text-[length:var(--font-font-size-caption)] leading-[var(--font-line-height-lh-caption)]",
  ],
] as const;

function Surface({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--color-background-secondary)] p-nell-24 text-[var(--color-text-primary)]">
      <div className="mx-auto flex max-w-[1100px] flex-col gap-nell-32">
        {children}
      </div>
    </div>
  );
}

function Section({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="flex flex-col gap-nell-16">
      <h2 className="font-title text-[length:var(--font-font-size-title)] leading-[var(--font-line-height-lh-title)]">
        {title}
      </h2>
      {children}
    </section>
  );
}

function TokenSwatch({ token }: { token: string }) {
  return (
    <div className="flex items-center gap-nell-12 rounded-nell-m border border-[var(--color-border-opaque)] bg-[var(--color-background-primary)] p-nell-12">
      <div
        className="size-[44px] rounded-nell-s border border-[var(--color-border-subtle)]"
        style={{ backgroundColor: `var(${token})` }}
      />
      <div className="min-w-0">
        <div className="truncate font-mono text-[12px] leading-[16px]">
          {token}
        </div>
        <div className="text-[length:var(--font-font-size-caption)] leading-[var(--font-line-height-lh-caption)] text-[var(--color-text-secondary)]">
          Figma token export
        </div>
      </div>
    </div>
  );
}

function DsButton({
  children,
  disabled,
  selected,
  variant,
}: {
  children: ReactNode;
  disabled?: boolean;
  selected?: boolean;
  variant: "primary" | "secondary" | "tertiary";
}) {
  return (
    <button
      className={[
        "inline-flex h-[38px] items-center justify-center rounded-nell-s px-nell-12 font-body text-[length:var(--font-font-size-cta)] leading-[var(--font-line-height-lh-subtext)] transition",
        variant === "primary" &&
          "bg-[var(--color-core-primary-a)] text-[var(--color-text-inverse-primary)]",
        variant === "secondary" &&
          "bg-[var(--color-background-secondary)] text-[var(--color-text-primary)]",
        variant === "tertiary" &&
          "bg-transparent text-[var(--color-text-primary)]",
        selected && "ring-2 ring-[var(--color-border-selected)]",
        disabled && "cursor-not-allowed opacity-40",
      ]
        .filter(Boolean)
        .join(" ")}
      disabled={disabled}
      type="button"
    >
      {children}
    </button>
  );
}

function Checkbox({ checked }: { checked?: boolean }) {
  return (
    <button
      aria-pressed={checked}
      className="flex size-[24px] items-center justify-center rounded-nell-xxs border border-[var(--color-border-opaque)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)] data-[state=on]:bg-[var(--color-core-primary-a)] data-[state=on]:text-[var(--color-text-inverse-primary)]"
      data-state={checked ? "on" : "off"}
      type="button"
    >
      {checked ? <Check className="size-[16px]" /> : null}
    </button>
  );
}

function ToastPreview({ state }: { state: "neutral" | "success" | "error" }) {
  const Icon = state === "success" ? CircleCheck : CircleAlert;
  return (
    <div
      className={[
        "flex min-h-[48px] w-[320px] items-center gap-nell-12 rounded-nell-m px-nell-16 py-nell-12 font-body text-[length:var(--font-font-size-body)] leading-[var(--font-line-height-lh-body)]",
        state === "neutral" &&
          "bg-[var(--color-background-primary)] text-[var(--color-text-primary)]",
        state === "success" &&
          "bg-[var(--color-state-success)] text-[var(--color-text-inverse-primary)]",
        state === "error" &&
          "bg-[var(--color-state-errored)] text-[var(--color-text-inverse-primary)]",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Icon className="size-[18px]" />
      <span>
        {state === "error" ? "Error message here" : `${state} message here`}
      </span>
    </div>
  );
}

function AgentControlPreview({
  state = "default",
}: {
  state?: "default" | "typing" | "streaming";
}) {
  return (
    <div className="flex w-[448px] max-w-full flex-col gap-nell-20 rounded-[31px] border border-[var(--color-border-opaque)] bg-[var(--color-background-primary)] px-nell-20 py-nell-16 shadow-[0_3px_3px_rgba(0,0,0,0.03)]">
      <div className="flex items-center">
        <span className="font-body text-[length:var(--font-font-size-body)] leading-[var(--font-line-height-lh-body)] text-[var(--color-text-secondary)]">
          {state === "typing" ? "Bonjourno" : "How are you feeling today?"}
        </span>
        <Settings2 className="ml-auto size-[20px] text-[var(--color-text-secondary)]" />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-nell-4">
          <button className="flex h-[36px] items-center rounded-nell-round bg-[var(--color-background-secondary)] text-[var(--color-text-primary)]">
            <span className="flex h-full items-center px-nell-12">
              <Mic className="size-[18px]" />
            </span>
            <span className="h-[16px] w-px bg-[var(--color-bg-secondary)]" />
            <span className="flex h-full items-center px-nell-12">
              <ChevronDown className="size-[16px]" />
            </span>
          </button>
          <button className="flex h-[36px] items-center gap-nell-8 rounded-nell-round border border-[var(--color-border-subtle)] px-[15px]">
            <span className="flex size-[16px] items-center justify-center rounded-nell-round bg-[var(--color-bg-secondary)] text-[10px] text-[var(--color-text-inverse-primary)]">
              M
            </span>
            <span className="font-body text-[length:var(--font-font-size-body)] font-[var(--font-font-weight-semi-bold)] leading-[var(--font-line-height-lh-body)]">
              Masa Son
            </span>
            <ChevronDown className="size-[12px]" />
          </button>
        </div>
        {state === "typing" ? (
          <button className="flex size-[36px] items-center justify-center rounded-nell-round bg-[var(--color-core-primary-a)] text-[var(--color-text-inverse-primary)]">
            ↑
          </button>
        ) : state === "streaming" ? (
          <button className="flex size-[36px] items-center justify-center rounded-nell-round bg-[var(--color-core-primary-a)] text-[var(--color-text-inverse-primary)]">
            ■
          </button>
        ) : (
          <DsButton variant="primary">End Chat</DsButton>
        )}
      </div>
    </div>
  );
}

function Overview() {
  return (
    <Surface>
      <Section title="Colors">
        <div className="grid grid-cols-1 gap-nell-12 md:grid-cols-2">
          {colorTokens.map((token) => (
            <TokenSwatch key={token} token={token} />
          ))}
        </div>
      </Section>

      <Section title="Typography">
        <div className="rounded-nell-m border border-[var(--color-border-opaque)] bg-[var(--color-background-primary)] p-nell-16">
          {typeRows.map(([label, className]) => (
            <div
              className="grid grid-cols-[120px_minmax(0,1fr)] items-baseline gap-nell-16 border-b border-[var(--color-border-subtle)] py-nell-12 last:border-b-0"
              key={label}
            >
              <span className="font-body text-[length:var(--font-font-size-caption)] text-[var(--color-text-secondary)]">
                {label}
              </span>
              <span className={className}>Dennis Design System</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap gap-nell-12">
          <DsButton variant="primary">Primary</DsButton>
          <DsButton variant="primary" selected>
            Selected
          </DsButton>
          <DsButton variant="primary" disabled>
            Disabled
          </DsButton>
          <DsButton variant="secondary">Secondary</DsButton>
          <DsButton variant="tertiary">Tertiary</DsButton>
        </div>
      </Section>

      <Section title="Selection And Toasts">
        <div className="flex flex-wrap items-center gap-nell-16">
          <Checkbox />
          <Checkbox checked />
          <ToastPreview state="neutral" />
          <ToastPreview state="success" />
          <ToastPreview state="error" />
        </div>
      </Section>

      <Section title="Agent Control Bar">
        <div className="flex flex-col gap-nell-16">
          <AgentControlPreview />
          <AgentControlPreview state="typing" />
          <AgentControlPreview state="streaming" />
        </div>
      </Section>
    </Surface>
  );
}

const meta = {
  title: "Dennis Design System/Overview",
  component: Overview,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof Overview>;

export default meta;

type Story = StoryObj<typeof meta>;

export const FoundationsAndComponents: Story = {};
