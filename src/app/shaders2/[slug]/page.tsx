// app/shaders2/[slug]/page.tsx
import { notFound } from "next/navigation";
import { ALL_SLUGS, SHADERS, type ShaderSlug } from "../data";

interface Params {
  slug: ShaderSlug;
}

interface PageProps {
  // In Next.js 15, `params` is technically a Promise<{ slug: string }>
  params: Params | Promise<Params>;
}

export function generateStaticParams(): Array<{ slug: ShaderSlug }> {
  return ALL_SLUGS.map((slug) => ({ slug }));
}

export default async function ShaderPage({ params }: PageProps) {
  // ✨ await the params promise before using it
  const { slug } = await params;

  // If someone navigates to an unknown slug, return 404
  if (!ALL_SLUGS.includes(slug)) {
    return notFound();
  }

  const { title, Component } = SHADERS[slug];

  return (
    <main className="h-screen w-screen">
      {/* <h1>{title}</h1> */}
      <Component />
    </main>
  );
}
