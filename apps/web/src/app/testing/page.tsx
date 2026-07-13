import type { Metadata } from "next";

import { TestingClient } from "./testing-client";

export const metadata: Metadata = {
  title: "/testing",
};

export default function TestingPage() {
  return <TestingClient />;
}
