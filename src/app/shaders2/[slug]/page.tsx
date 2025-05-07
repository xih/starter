// app/shaders2/[slug]/page.tsx
import { notFound } from "next/navigation";
import { ALL_SLUGS, SHADERS, type ShaderSlug } from "../data";

export function generateStaticParams(): Array<{ slug: ShaderSlug }> {
  return ALL_SLUGS.map((slug) => ({ slug }));
}

export default async function ShaderPage({
  // inline the params type instead of your own PageProps
  params,
}: {
  params: { slug: ShaderSlug };
}) {
  // you can still await() it even if TS thinks it's a plain object
  const { slug } = params;

  if (!ALL_SLUGS.includes(slug)) {
    return notFound();
  }

  const { Component } = SHADERS[slug];
  return (
    <main className="h-screen w-screen">
      <Component />
    </main>
  );
}
