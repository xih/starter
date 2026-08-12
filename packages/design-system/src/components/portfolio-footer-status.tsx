"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

const INITIAL_VISITORS = 2;
const VISITOR_MIN = 1;
const VISITOR_MAX = 12;
const VISITOR_INTERVAL_MS = 20_000;

function formatClockTime(date: Date) {
  const hours24 = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  const period = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  return { digits: `${hours12}:${mm}:${ss}`, period };
}

function nextVisitorCount(previous: number) {
  const magnitude = 1 + Math.floor(Math.random() * 3);
  const direction = Math.random() < 0.5 ? -1 : 1;
  const proposed = previous + magnitude * direction;
  if (proposed < VISITOR_MIN) {
    return previous + magnitude;
  }
  if (proposed > VISITOR_MAX) {
    return previous - magnitude;
  }
  return proposed;
}

export function PortfolioFooterStatus() {
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const [visitors, setVisitors] = useState(INITIAL_VISITORS);

  useEffect(() => {
    setMounted(true);
    setNow(new Date());
    setVisitors(2 + Math.round(Math.random()));

    const clockInterval = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    const visitorInterval = window.setInterval(() => {
      setVisitors((previous) => nextVisitorCount(previous));
    }, VISITOR_INTERVAL_MS);

    return () => {
      window.clearInterval(clockInterval);
      window.clearInterval(visitorInterval);
    };
  }, []);

  const clock =
    mounted && now ? formatClockTime(now) : { digits: " ", period: "" };

  return (
    <p className="mb-[15px] flex items-center gap-[6px]">
      <span className="size-[7px] rounded-full bg-[#52d34f]" />
      <span className="inline-flex items-baseline gap-[6px]">
        <span className="inline-flex items-baseline tabular-nums">
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              key={visitors}
              transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
            >
              {visitors}
            </motion.span>
          </AnimatePresence>
          <span>&nbsp;{visitors === 1 ? "visitor" : "visitors"}</span>
        </span>
        <span aria-hidden="true">&nbsp;</span>
        <span className="inline-flex items-baseline gap-[4px]">
          <span
            className="font-mono tabular-nums tracking-[-0.01em]"
            style={{ fontFeatureSettings: "'tnum' 1" }}
          >
            {clock.digits}
          </span>
          {clock.period ? <span>{clock.period}</span> : null}
        </span>
      </span>
    </p>
  );
}
