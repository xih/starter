import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CaseStudy, getCaseStudy, getCaseStudySlugs } from "~/components/CaseStudy";

type WorkPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return getCaseStudySlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: WorkPageProps): Promise<Metadata> {
  const { slug } = await params;
  const study = getCaseStudy(slug);

  if (!study) {
    return { title: "Work" };
  }

  return {
    title: `${study.company} — ${study.role}`,
    description: study.description,
  };
}

export default async function WorkPage({ params }: WorkPageProps) {
  const { slug } = await params;
  const study = getCaseStudy(slug);

  if (!study) {
    notFound();
  }

  return <CaseStudy study={study} />;
}
