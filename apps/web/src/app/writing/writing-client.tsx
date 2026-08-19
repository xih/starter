"use client";

import { PortfolioFooter } from "@starter/design-system";

import { PortfolioHeader } from "~/components/PortfolioHeader";
import { SkeuomorphicClock } from "~/components/SkeuomorphicClock";
import { WritingPostList, type WritingPost } from "~/components/WritingPosts";

function WritingFooter() {
  return (
    <PortfolioFooter
      clock={
        <SkeuomorphicClock
          running
          secondHandMotion="sweep"
          showControls={false}
          size={135}
        />
      }
    />
  );
}

export function WritingClient({ posts }: { posts: WritingPost[] }) {
  return (
    <main className="min-h-screen overflow-x-hidden bg-white text-[#121318]">
      <section className="relative mx-auto min-h-[806px] w-full max-w-[1728px] px-[20px] pb-[96px] pt-[78px] md:px-[116px] md:pt-[123px]">
        <PortfolioHeader activePage="writing" tone="dark" />

        <div className="flex w-full flex-col gap-token-32 md:w-[692px]">
          <h1 className="font-title text-[48px] font-[500] leading-[52.8px] tracking-[-0.02em] text-text-primary">
            Writing
          </h1>
          <WritingPostList posts={posts} />
        </div>
      </section>
      <WritingFooter />
    </main>
  );
}
