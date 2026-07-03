import type { Meta, StoryObj } from "@storybook/nextjs-vite";

const colorTokens = [
  "color-text-primary",
  "color-text-secondary",
  "color-text-inverse",
  "color-bg-app",
  "color-bg-primary",
  "color-bg-primary-80",
  "color-bg-secondary",
  "color-border-primary",
  "color-border-secondary",
  "color-button-primary",
  "color-button-secondary",
  "color-button-tertiary",
  "color-state-disabled",
  "color-state-error",
  "color-state-neutral",
  "color-state-success",
  "color-state-warning",
  "color-brand-sand-900",
  "color-brand-sand-500",
  "color-brand-peach-900",
  "color-brand-peach-500",
  "color-brand-pink-900",
  "color-brand-pink-600",
  "color-brand-pink-500",
  "color-brand-red-900",
  "color-brand-red-600",
  "color-brand-red-500",
  "color-brand-burg-900",
  "color-brand-burg-800",
  "color-brand-burg-700",
  "color-brand-burg-600",
  "color-brand-burg-500",
];

const spacingTokens = [
  "spacing-0",
  "spacing-2",
  "spacing-4",
  "spacing-8",
  "spacing-12",
  "spacing-16",
  "spacing-20",
  "spacing-24",
  "spacing-32",
  "spacing-40",
  "spacing-48",
  "spacing-56",
  "spacing-64",
];

const radiusTokens = [
  "radius-xxs",
  "radius-xs",
  "radius-s",
  "radius-m",
  "radius-l",
  "radius-xl",
  "radius-round",
];

const typeTokens = [
  {
    label: "Title",
    className: "font-title text-title",
  },
  {
    label: "Headline",
    className: "font-title text-headline",
  },
  {
    label: "CTA",
    className: "font-body text-cta",
  },
  {
    label: "Subtext",
    className: "font-body text-subtext",
  },
  {
    label: "Body",
    className: "font-body text-body",
  },
  {
    label: "Caption",
    className: "font-body text-caption",
  },
];

function TokenSurface({ mode }: { mode: "light" | "dark" }) {
  return (
    <section className={mode === "dark" ? "dark" : undefined}>
      <div className="min-h-screen bg-background p-8 font-body text-foreground">
        <div className="mx-auto grid max-w-6xl gap-10">
          <header className="border-b border-border pb-4">
            <p className="text-caption uppercase text-muted-foreground">
              Nell tokens
            </p>
            <h1 className="text-title capitalize">{mode} theme</h1>
          </header>

          <section className="grid gap-4">
            <h2 className="text-headline">Colors</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {colorTokens.map((token) => (
                <div
                  key={token}
                  className="overflow-hidden rounded-nell-s border border-border bg-card"
                >
                  <div
                    className="h-20 border-b border-border"
                    style={{ backgroundColor: `var(--${token})` }}
                  />
                  <div className="grid gap-1 p-3 text-caption">
                    <span>{token}</span>
                    <span className="text-muted-foreground">
                      var(--{token})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-4">
            <h2 className="text-headline">Spacing</h2>
            <div className="grid gap-3">
              {spacingTokens.map((token) => (
                <div key={token} className="grid grid-cols-[96px_1fr] gap-4">
                  <span className="text-caption text-muted-foreground">
                    {token}
                  </span>
                  <div
                    className="h-4 bg-primary"
                    style={{ width: `var(--${token})` }}
                  />
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-4">
            <h2 className="text-headline">Radius</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {radiusTokens.map((token) => (
                <div
                  key={token}
                  className="grid h-24 place-items-center border border-border bg-card text-caption"
                  style={{ borderRadius: `var(--${token})` }}
                >
                  {token}
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-4">
            <h2 className="text-headline">Typography</h2>
            <div className="grid gap-3">
              {typeTokens.map((token) => (
                <p key={token.label} className={token.className}>
                  {token.label}: The quick brown fox jumps over the lazy dog.
                </p>
              ))}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}

const meta = {
  title: "Design System/Nell Tokens",
  component: TokenSurface,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof TokenSurface>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Light: Story = {
  args: {
    mode: "light",
  },
};

export const Dark: Story = {
  args: {
    mode: "dark",
  },
};
