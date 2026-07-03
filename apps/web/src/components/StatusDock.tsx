"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { cn } from "~/lib/utils";

type StatusDockViewport = "mobile" | "desktop";

type StatusDockWeather = {
  condition: string;
  temperatureF: number;
  windInchesPerSecond?: number;
  precipitationLabel?: string;
};

type StatusDockLocation = {
  city: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
};

export type StatusDockData = {
  visitors: number;
  location: StatusDockLocation;
  weather: StatusDockWeather;
  now?: Date;
};

export type StatusDockProps = {
  className?: string;
  data?: StatusDockData;
  live?: boolean;
  viewport?: StatusDockViewport;
};

type IpApiResponse = {
  city?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
};

type OpenMeteoResponse = {
  current?: {
    temperature_2m?: number;
    weather_code?: number;
    wind_speed_10m?: number;
    precipitation?: number;
  };
};

const DEFAULT_STATUS_DOCK_DATA: StatusDockData = {
  visitors: 2,
  location: {
    city: "San Francisco",
    latitude: 37.7749,
    longitude: -122.4194,
    timezone: "America/Los_Angeles",
  },
  weather: {
    condition: "Overcast",
    temperatureF: 70,
    windInchesPerSecond: 19.1,
    precipitationLabel: "Rain",
  },
};

const weatherCodeLabels = new Map<number, string>([
  [0, "Clear"],
  [1, "Mainly Clear"],
  [2, "Partly Cloudy"],
  [3, "Overcast"],
  [45, "Fog"],
  [48, "Rime Fog"],
  [51, "Drizzle"],
  [53, "Drizzle"],
  [55, "Drizzle"],
  [61, "Rain"],
  [63, "Rain"],
  [65, "Rain"],
  [71, "Snow"],
  [73, "Snow"],
  [75, "Snow"],
  [80, "Rain Showers"],
  [81, "Rain Showers"],
  [82, "Rain Showers"],
  [95, "Thunderstorm"],
]);

const LIVE_STATUS_FETCH_TIMEOUT_MS = 5000;

function formatTime(now: Date, timezone?: string) {
  const options: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  };

  try {
    return new Intl.DateTimeFormat("en-US", {
      ...options,
      timeZone: timezone,
    }).format(now);
  } catch {
    return new Intl.DateTimeFormat("en-US", options).format(now);
  }
}

function formatTemperature(value: number) {
  return `${Math.round(value)}°F`;
}

function formatWeather(weather: StatusDockWeather) {
  return `${weather.condition}, ${formatTemperature(weather.temperatureF)}`;
}

function formatWindInchesPerSecond(value?: number) {
  if (typeof value !== "number") return "19.1 in/s";
  return `${value.toFixed(1)} in/s`;
}

function milesPerHourToInchesPerSecond(value: number) {
  return value * 17.6;
}

function getWeatherCondition(code?: number) {
  if (typeof code !== "number")
    return DEFAULT_STATUS_DOCK_DATA.weather.condition;
  return weatherCodeLabels.get(code) ?? "Overcast";
}

async function fetchLiveStatusData() {
  const locationResponse = await fetch("https://ipapi.co/json/", {
    signal: AbortSignal.timeout(LIVE_STATUS_FETCH_TIMEOUT_MS),
  });

  if (!locationResponse.ok) {
    throw new Error("Unable to load IP location");
  }

  const location = (await locationResponse.json()) as IpApiResponse;
  const latitude = location.latitude;
  const longitude = location.longitude;

  if (typeof latitude !== "number" || typeof longitude !== "number") {
    throw new Error("IP location did not include coordinates");
  }

  const weatherUrl = new URL("https://api.open-meteo.com/v1/forecast");
  weatherUrl.searchParams.set("latitude", String(latitude));
  weatherUrl.searchParams.set("longitude", String(longitude));
  weatherUrl.searchParams.set(
    "current",
    "temperature_2m,weather_code,wind_speed_10m,precipitation",
  );
  weatherUrl.searchParams.set("temperature_unit", "fahrenheit");
  weatherUrl.searchParams.set("wind_speed_unit", "mph");
  weatherUrl.searchParams.set("timezone", location.timezone ?? "auto");

  const weatherResponse = await fetch(weatherUrl, {
    signal: AbortSignal.timeout(LIVE_STATUS_FETCH_TIMEOUT_MS),
  });

  if (!weatherResponse.ok) {
    throw new Error("Unable to load current weather");
  }

  const weather = (await weatherResponse.json()) as OpenMeteoResponse;
  const current = weather.current;

  return {
    visitors: DEFAULT_STATUS_DOCK_DATA.visitors,
    location: {
      city: location.city ?? DEFAULT_STATUS_DOCK_DATA.location.city,
      latitude,
      longitude,
      timezone: location.timezone,
    },
    weather: {
      condition: getWeatherCondition(current?.weather_code),
      temperatureF:
        typeof current?.temperature_2m === "number"
          ? current.temperature_2m
          : DEFAULT_STATUS_DOCK_DATA.weather.temperatureF,
      windInchesPerSecond:
        typeof current?.wind_speed_10m === "number"
          ? milesPerHourToInchesPerSecond(current.wind_speed_10m)
          : DEFAULT_STATUS_DOCK_DATA.weather.windInchesPerSecond,
      precipitationLabel:
        typeof current?.precipitation === "number" && current.precipitation > 0
          ? "Rain"
          : "Dry",
    },
  } satisfies StatusDockData;
}

function useStatusDockData(data?: StatusDockData, live = false) {
  const [now, setNow] = useState(() => data?.now ?? new Date());
  const [liveData, setLiveData] = useState<StatusDockData | null>(null);

  useEffect(() => {
    if (data?.now) {
      setNow(data.now);
      return;
    }

    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [data?.now]);

  useEffect(() => {
    if (!live) {
      setLiveData(null);
      return;
    }

    let ignore = false;

    void fetchLiveStatusData()
      .then((nextData) => {
        if (!ignore) setLiveData(nextData);
      })
      .catch(() => {
        if (!ignore) setLiveData(null);
      });

    return () => {
      ignore = true;
    };
  }, [live]);

  const resolvedData = live ? (liveData ?? data) : data;

  return {
    ...(resolvedData ?? DEFAULT_STATUS_DOCK_DATA),
    now,
  };
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
        "relative inline-flex h-[18px] shrink-0 items-center whitespace-nowrap font-body text-[length:var(--font-font-size-body)] font-[var(--font-font-weight-medium)] leading-[var(--font-line-height-lh-body)] text-[var(--color-text-inverse)]",
        className,
      )}
    >
      {children}
    </span>
  );
}

function VisitorDot() {
  return (
    <span
      aria-hidden="true"
      className="block size-[8px] shrink-0 rounded-nell-round bg-[var(--color-state-success)]"
    />
  );
}

export function StatusDock({
  className,
  data,
  live = false,
  viewport = "mobile",
}: StatusDockProps) {
  const status = useStatusDockData(data, live);
  const time = useMemo(
    () => formatTime(status.now, status.location.timezone),
    [status.location.timezone, status.now],
  );
  const isDesktop = viewport === "desktop";

  return (
    <div
      className={cn(
        "h-[34px] overflow-hidden bg-[var(--color-button-primary)] text-[var(--color-text-inverse)]",
        isDesktop
          ? "flex w-[1728px] items-center gap-nell-8"
          : "relative w-[402px]",
        className,
      )}
      data-figma-node="37:66"
      data-viewport={viewport}
    >
      <div
        className={cn(
          "flex h-full items-center gap-nell-16 px-nell-8 py-0",
          isDesktop ? "relative shrink-0" : "absolute left-0 top-0 w-[402px]",
        )}
        data-figma-node={isDesktop ? "37:32" : "37:55"}
      >
        <div className="flex h-[18px] items-center gap-nell-8">
          <VisitorDot />
          <StatusText>{status.visitors} visitors</StatusText>
        </div>

        <StatusText>{time}</StatusText>

        <StatusText>
          {status.location.city || DEFAULT_STATUS_DOCK_DATA.location.city}
        </StatusText>

        <StatusText>{formatWeather(status.weather)}</StatusText>
      </div>

      {isDesktop && (
        <>
          <div className="flex h-full shrink-0 items-center p-nell-8">
            <StatusText>
              {formatWindInchesPerSecond(status.weather.windInchesPerSecond)}
            </StatusText>
          </div>
          <div className="flex h-full shrink-0 items-center p-nell-8">
            <StatusText>
              {status.weather.precipitationLabel ?? "Rain"}
            </StatusText>
          </div>
        </>
      )}
    </div>
  );
}

export { DEFAULT_STATUS_DOCK_DATA };
