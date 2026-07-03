import { tokens } from "@starter/tokens/tailwind";
import { type Config } from "tailwindcss";
import { fontFamily } from "tailwindcss/defaultTheme";
import tailwindcssAnimate from "tailwindcss-animate";

const cssColor = (name: string) => `var(${name})`;
const token = (value: string | undefined) => {
  if (!value) {
    throw new Error("Missing design token value");
  }

  return value;
};
const prefixTokenMap = (values: Record<string, string>, prefix: string) =>
  Object.fromEntries(
    Object.entries(values).map(([key, value]) => [`${prefix}-${key}`, value]),
  );

export default {
  darkMode: ["class"],
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/design-system/src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)", ...fontFamily.sans],
        body: ["var(--font-font-family-body)", ...fontFamily.sans],
        title: ["var(--font-font-family-title)", ...fontFamily.sans],
      },
      fontSize: {
        title: [
          token(tokens.fontSize.title),
          {
            lineHeight: token(tokens.lineHeight.lhTitle),
            letterSpacing: token(tokens.letterSpacing.title),
            fontWeight: token(tokens.fontWeight.semiBold),
          },
        ],
        headline: [
          token(tokens.fontSize.headline),
          {
            lineHeight: token(tokens.lineHeight.lhHeadline),
            fontWeight: token(tokens.fontWeight.semiBold),
          },
        ],
        body: [
          token(tokens.fontSize.body),
          {
            lineHeight: token(tokens.lineHeight.lhBody),
            fontWeight: token(tokens.fontWeight.regular),
          },
        ],
        subtext: [
          token(tokens.fontSize.subtext),
          {
            lineHeight: token(tokens.lineHeight.lhSubtext),
            fontWeight: token(tokens.fontWeight.regular),
          },
        ],
        caption: [
          token(tokens.fontSize.caption),
          {
            lineHeight: token(tokens.lineHeight.lhCaption),
            fontWeight: token(tokens.fontWeight.regular),
          },
        ],
        cta: [
          token(tokens.fontSize.cta),
          {
            lineHeight: token(tokens.lineHeight.lhCta),
            fontWeight: token(tokens.fontWeight.medium),
          },
        ],
      },
      fontWeight: tokens.fontWeight,
      lineHeight: tokens.lineHeight,
      letterSpacing: tokens.letterSpacing,
      spacing: prefixTokenMap(tokens.spacing, "nell"),
      borderRadius: {
        ...prefixTokenMap(tokens.borderRadius, "nell"),
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        ...tokens.colors,
        background: cssColor("--background"),
        foreground: cssColor("--foreground"),
        card: {
          DEFAULT: cssColor("--card"),
          foreground: cssColor("--card-foreground"),
        },
        popover: {
          DEFAULT: cssColor("--popover"),
          foreground: cssColor("--popover-foreground"),
        },
        primary: {
          DEFAULT: cssColor("--primary"),
          foreground: cssColor("--primary-foreground"),
        },
        secondary: {
          DEFAULT: cssColor("--secondary"),
          foreground: cssColor("--secondary-foreground"),
        },
        muted: {
          DEFAULT: cssColor("--muted"),
          foreground: cssColor("--muted-foreground"),
        },
        accent: {
          DEFAULT: cssColor("--accent"),
          foreground: cssColor("--accent-foreground"),
        },
        destructive: {
          DEFAULT: cssColor("--destructive"),
          foreground: cssColor("--destructive-foreground"),
        },
        border: cssColor("--border"),
        input: cssColor("--input"),
        ring: cssColor("--ring"),
        sidebar: {
          DEFAULT: cssColor("--sidebar-background"),
          foreground: cssColor("--sidebar-foreground"),
          primary: cssColor("--sidebar-primary"),
          "primary-foreground": cssColor("--sidebar-primary-foreground"),
          accent: cssColor("--sidebar-accent"),
          "accent-foreground": cssColor("--sidebar-accent-foreground"),
          border: cssColor("--sidebar-border"),
          ring: cssColor("--sidebar-ring"),
        },
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "heart-pop": {
          "0%": { transform: "scale(0)", opacity: "0" },
          "50%": { transform: "scale(1.2)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "0" },
        },
        typing: {
          "0%, 100%": { transform: "translateY(0)", opacity: "0.5" },
          "50%": { transform: "translateY(-2px)", opacity: "1" },
        },
        "loading-dots": {
          "0%, 100%": { opacity: "0" },
          "50%": { opacity: "1" },
        },
        wave: {
          "0%, 100%": { transform: "scaleY(1)" },
          "50%": { transform: "scaleY(0.6)" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        shimmer: {
          "0%": { backgroundPosition: "200% 50%" },
          "100%": { backgroundPosition: "-200% 50%" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "heart-pop": "heart-pop 1s ease-out forwards",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
