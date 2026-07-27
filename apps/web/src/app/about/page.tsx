import type { Metadata } from "next";

import { AboutClient } from "./about-client";

export const metadata: Metadata = {
  title: "About",
};

export default function AboutPage() {
  return <AboutClient />;
}
