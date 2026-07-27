"use client";

import { LiveChatModule } from "@starter/design-system";
import Image from "next/image";
import Link from "next/link";

const aboutPhotos = [
  {
    alt: "Dennis standing with a bike at Hawk Hill during sunset",
    caption: "Biking Hawk Hill",
    src: "/about/biking-hawk-hill.png",
  },
  {
    alt: "Dennis skiing at Heavenly in snowy conditions",
    caption: "Skiing Heavenly",
    src: "/about/skiing-heavenly.png",
  },
  {
    alt: "Dennis biking near a rounded concrete structure",
    caption: "Biking",
    src: "/about/biking.png",
  },
  {
    alt: "Dennis sailing a J-22 on the bay",
    caption: "Sailing J-22",
    src: "/about/sailing-j22.png",
  },
] as const;

function TopNavigation() {
  return (
    <nav className="absolute left-0 top-token-2 z-20 hidden w-full px-token-20 py-token-12 font-body text-[16px] leading-[20px] text-[#1e1f24] md:block">
      <div className="flex w-full items-center justify-between">
        <Link href="/" aria-label="Dennis Xing home">
          DX
        </Link>
        <Link href="/about" aria-current="page">
          About
        </Link>
      </div>
    </nav>
  );
}

function AboutCopy() {
  return (
    <section className="w-full md:w-[374px]">
      <div className="flex flex-col gap-token-12">
        <h1 className="font-title text-[36px] font-[700] leading-[40px] tracking-[0]">
          About
        </h1>
        <p className="font-body text-[16px] leading-lhSubtext">
          Dennis Xing is a product designer based in San Francisco, exploring
          interactive systems, agent experiences, and interfaces that feel alive
          without getting in the way.
        </p>
      </div>

      <div className="mt-token-24 font-body text-[16px] leading-lhSubtext md:mt-[63px]">
        <p>I live in the intersection between</p>
        <ol className="list-decimal pl-token-24">
          <li>A$AP Rocky and Rachminoff&apos;s Piano Concerto No 2</li>
          <li>B2B SaaS and Yayoi Kusama</li>
          <li>Tradition and revolution</li>
          <li>JAL 737-100 F class and 5/24</li>
          <li>Pontresina and Pleasures</li>
        </ol>

        <p className="mt-[38px]">What I believe:</p>
        <p>
          Figure it out!
          <br />
          Start with the problem
          <br />
          Designs are hypotheses
          <br />
          KPIs validate them
          <br />
          Collaboration is critical
          <br />
          Break silos with quick feedback loops
        </p>
      </div>
    </section>
  );
}

function PhotoGrid() {
  return (
    <section
      aria-label="About photos"
      className="grid w-full grid-cols-2 gap-x-[43px] gap-y-[46px] md:w-[452px]"
    >
      {aboutPhotos.map((photo) => (
        <figure key={photo.src} className="flex min-w-0 flex-col gap-token-8">
          <div className="relative aspect-[3/4] w-full overflow-hidden">
            <Image
              alt={photo.alt}
              className="object-cover"
              fill
              sizes="(min-width: 768px) 205px, 160px"
              src={photo.src}
            />
          </div>
          <figcaption className="text-center font-body text-[16px] leading-lhSubtext text-[#4b4b4b]">
            {photo.caption}
          </figcaption>
        </figure>
      ))}
    </section>
  );
}

function AboutLiveChat() {
  return (
    <>
      <LiveChatModule
        className="fixed bottom-0 right-[max(76px,calc((100vw-1728px)/2+76px))] z-30 hidden w-[371px] md:flex"
        fadeDurationMs={600}
        height={337}
        initialMessageCount={4}
        maxVisibleMessages={4}
        streamIntervalMs={640}
        visibleDurationMs={3600}
      />
      <LiveChatModule
        className="fixed bottom-[46px] left-token-20 right-token-20 z-30 w-auto md:hidden"
        fadeDurationMs={560}
        height={337}
        initialMessageCount={3}
        maxVisibleMessages={3}
        streamIntervalMs={640}
        visibleDurationMs={2600}
      />
    </>
  );
}

export function AboutClient() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-white text-[#121318]">
      <section className="relative mx-auto min-h-[1129px] w-full max-w-[1728px] px-token-20 pb-[430px] pt-[105px] md:min-h-[1117px] md:px-0 md:pb-0 md:pt-0">
        <TopNavigation />

        <div className="relative z-10 flex w-full flex-col gap-token-16 md:absolute md:left-[213px] md:top-[170px] md:w-[1117px] md:flex-row md:gap-[291px]">
          <AboutCopy />
          <PhotoGrid />
        </div>

        <AboutLiveChat />
      </section>
    </main>
  );
}
