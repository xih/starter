import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  CaseStudy,
  getCaseStudy,
  getCaseStudySlugs,
} from "~/components/CaseStudy";

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
    return {
      title: "Work",
      alternates: { canonical: `/work/${slug}` },
    };
  }

  const canonical = `/work/${study.slug}`;
  const title = `${study.company} case study — ${study.role} · Dennis Xing`;
  const description = `${study.company} · ${study.role} (${study.period}). ${study.description}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
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
