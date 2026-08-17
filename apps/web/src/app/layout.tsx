import "@starter/tokens/css";
import "@starter/design-system/styles";
import "~/styles/globals.css";
import "dialkit/styles.css";

import { GeistSans } from "geist/font/sans";
import { type Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { SITE_URL } from "~/config/site";
import { DialKitRoot } from "~/components/DialKitRoot";
import { VoiceRecorderProvider } from "~/hooks/useVoiceRecorder";
import { TRPCReactProvider } from "~/trpc/react";
import { Toaster } from "~/components/ui/sonner";

const siteTitle = "Dennis Xing";
const siteDescription =
  "Product designer based in San Francisco. Previously at Nell, AGI, Krea, and Skydio.";
const openGraphImageUrl =
  "/og/dennis-agent-portfolio.png?v=20260817-figma-og";
const twitterImageUrl =
  "/og/dennis-agent-portfolio-twitter.png?v=20260817-figma-twitter";

export const metadata: Metadata = {
  metadataBase: SITE_URL,
  title: siteTitle,
  description: siteDescription,
  alternates: {
    canonical: "/",
  },
  icons: [
    { rel: "icon", url: "/favicon.ico", sizes: "any" },
    { rel: "icon", url: "/icon-192.png", type: "image/png", sizes: "192x192" },
    { rel: "icon", url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    { rel: "apple-touch-icon", url: "/apple-touch-icon.png" },
  ],
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    url: SITE_URL,
    siteName: "Dennis Xing",
    images: [
      {
        url: openGraphImageUrl,
        width: 1200,
        height: 1200,
        alt: "Dennis Xing — AI Product Designer.",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: [
      {
        url: twitterImageUrl,
        width: 1200,
        height: 600,
        alt: "Dennis Xing — AI Product Designer.",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable}`}
      suppressHydrationWarning
    >
      <body suppressHydrationWarning>
        <VoiceRecorderProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <TRPCReactProvider>
              {children}
              <Toaster position="bottom-right" />
              <DialKitRoot defaultOpen={false} />
            </TRPCReactProvider>
          </ThemeProvider>
        </VoiceRecorderProvider>
      </body>
    </html>
  );
}
