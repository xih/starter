import { notFound } from "next/navigation";

import {
  getInteractionPattern,
  InteractionLogShell,
  interactionPatterns,
} from "~/components/interactions";

type InteractionPatternPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function InteractionPatternPage({
  params,
}: InteractionPatternPageProps) {
  const { slug } = await params;
  const pattern = getInteractionPattern(slug);

  if (!pattern) {
    notFound();
  }

  return (
    <InteractionLogShell
      activePattern={pattern}
      patterns={interactionPatterns}
    />
  );
}
