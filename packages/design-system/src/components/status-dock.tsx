import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { cn } from "../utils";

type StatusDockViewport = "mobile" | "desktop";

type StatusDockWeather = {
  condition: string;
  precipitationLabel?: string;
  temperatureF: number;
  windInchesPerSecond?: number;
};

type StatusDockLocation = {
  city: string;
  timezone?: string;
};

export type StatusDockData = {
  location: StatusDockLocation;
  now?: Date;
  visitors: number;
  weather: StatusDockWeather;
};

export type StatusDockProps = {
  className?: string;
  data?: StatusDockData;
  viewport?: StatusDockViewport;
};

export const DEFAULT_STATUS_DOCK_DATA: StatusDockData = {
  visitors: 2,
  location: {
    city: "San Francisco",
    timezone: "America/Los_Angeles",
  },
  now: new Date("2026-06-24T14:16:05-07:00"),
  weather: {
    condition: "Overcast",
    precipitationLabel: "Rain",
    temperatureF: 70,
    windInchesPerSecond: 19.1,
  },
};

function formatTime(now: Date, timezone?: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone: timezone,
  }).format(now);
}

function StatusText({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "font-body inline-flex h-[18px] shrink-0 items-center text-[14px] leading-[18px] font-[500] whitespace-nowrap text-white",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusDock({
  className,
  data = DEFAULT_STATUS_DOCK_DATA,
  viewport = "mobile",
}: StatusDockProps) {
  const [now, setNow] = useState(() => data.now ?? new Date());

  useEffect(() => {
    if (data.now) return;
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, [data.now]);

  const time = useMemo(
    () => formatTime(now, data.location.timezone),
    [data.location.timezone, now],
  );
  const isDesktop = viewport === "desktop";

  return (
    <div
      className={cn(
        "h-[34px] overflow-hidden bg-[#121318]",
        isDesktop ? "flex w-[1728px] items-center" : "w-[402px]",
        className,
      )}
      data-viewport={viewport}
    >
      <div className="flex h-full items-center gap-[16px] px-[8px]">
        <div className="flex items-center gap-[8px]">
          <span className="size-[8px] rounded-full bg-[#58bd3f]" />
          <StatusText className="text-[#222329]">
            {data.visitors} visitors
          </StatusText>
        </div>
        <StatusText>{time}</StatusText>
        <StatusText>{data.location.city}</StatusText>
        <StatusText>
          {data.weather.condition}, {Math.round(data.weather.temperatureF)}
          &deg;F
        </StatusText>
        {isDesktop ? (
          <>
            <StatusText className="pl-[8px]">
              {(data.weather.windInchesPerSecond ?? 19.1).toFixed(1)} in/s
            </StatusText>
            <StatusText className="pl-[24px]">
              {data.weather.precipitationLabel ?? "Rain"}
            </StatusText>
          </>
        ) : null}
      </div>
    </div>
  );
}
