import "@starter/tokens/css";
import "@starter/design-system/styles";
import "~/styles/globals.css";
import "dialkit/styles.css";

import { GeistSans } from "geist/font/sans";
import { type Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { SITE_URL } from "~/config/site";
import { VoiceRecorderProvider } from "~/hooks/useVoiceRecorder";
import { TRPCReactProvider } from "~/trpc/react";
import { Toaster } from "~/components/ui/sonner";

const siteTitle = "Dennis Xing | Chat with My Portfolio";
const siteDescription =
  "An interactive portfolio you can talk to: explore Dennis Xing's work, ideas, and projects through a live agent interface.";

export const metadata: Metadata = {
  metadataBase: SITE_URL,
  title: siteTitle,
  description: siteDescription,
  alternates: {
    canonical: "/",
  },
  icons: [
    { rel: "icon", url: "/favicon.ico", sizes: "any" },
    { rel: "icon", url: "/icon.svg", type: "image/svg+xml" },
    { rel: "apple-touch-icon", url: "/apple-touch-icon.png" },
  ],
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    url: SITE_URL,
    siteName: "Dennis Xing",
    images: [
      {
        url: "/og/dennis-agent-portfolio.png",
        width: 1200,
        height: 630,
        alt: "Dennis Xing interactive agent portfolio over a Golden Gate water scene.",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: ["/og/dennis-agent-portfolio.png"],
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
      <body>
        <VoiceRecorderProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <TRPCReactProvider>
              {children}
              <Toaster position="bottom-right" />
            </TRPCReactProvider>
          </ThemeProvider>
        </VoiceRecorderProvider>
      </body>
    </html>
  );
}
