import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white px-[22px] py-[48px] text-[#121318] md:px-[116px] md:py-[96px]">
      <div className="max-w-[720px]">
        <h1 className="font-title text-[42px] font-[700] leading-[44px] md:text-[72px] md:leading-[76px]">
          About
        </h1>
        <p className="mt-[24px] font-body text-[18px] leading-[28px] md:text-[22px] md:leading-[34px]">
          Dennis Xing is a product designer based in San Francisco, exploring
          interactive systems, agent experiences, and interfaces that feel alive
          without getting in the way.
        </p>
      </div>
    </main>
  );
}
