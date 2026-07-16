"use client";

import { useEffect, useId, useMemo, useState, type CSSProperties } from "react";

import { cn } from "~/lib/utils";

import styles from "./SkeuomorphicClock.module.css";

export type SecondHandMotion = "tick" | "sweep";

export interface SkeuomorphicClockProps {
  className?: string;
  initialTime?: string;
  running?: boolean;
  secondHandMotion?: SecondHandMotion;
  showControls?: boolean;
  size?: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const NUMBER_MARKS = Array.from({ length: 12 }, (_, index) => {
  const value = index === 0 ? 12 : index;
  return {
    angle: index * 30,
    value,
  };
});

function clampDayMs(ms: number) {
  return ((ms % DAY_MS) + DAY_MS) % DAY_MS;
}

function parseTimeToMs(value: string | undefined) {
  if (!value) {
    return 8 * 60 * 60 * 1000 + 50 * 60 * 1000 + 30 * 1000;
  }

  const [hours = "0", minutes = "0", seconds = "0"] = value.split(":");
  const hour = Number(hours);
  const minute = Number(minutes);
  const second = Number(seconds);

  if (
    Number.isNaN(hour) ||
    Number.isNaN(minute) ||
    Number.isNaN(second) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59 ||
    second < 0 ||
    second > 59
  ) {
    return 8 * 60 * 60 * 1000 + 50 * 60 * 1000 + 30 * 1000;
  }

  return hour * 60 * 60 * 1000 + minute * 60 * 1000 + second * 1000;
}

function isValidTimeString(value: string) {
  const match = /^(\d{2}):(\d{2}):(\d{2})$/.exec(value);

  if (!match) {
    return false;
  }

  const [, hours, minutes, seconds] = match;
  const hour = Number(hours);
  const minute = Number(minutes);
  const second = Number(seconds);

  return (
    hour >= 0 &&
    hour <= 23 &&
    minute >= 0 &&
    minute <= 59 &&
    second >= 0 &&
    second <= 59
  );
}

function formatTime(ms: number) {
  const totalSeconds = Math.floor(clampDayMs(ms) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((part) => part.toString().padStart(2, "0"))
    .join(":");
}

export function SkeuomorphicClock({
  className,
  initialTime = "08:50:30",
  running = true,
  secondHandMotion = "tick",
  showControls = true,
  size = 216,
}: SkeuomorphicClockProps) {
  const inputId = useId();
  const [motion, setMotion] = useState<SecondHandMotion>(secondHandMotion);
  const [baseTimeMs, setBaseTimeMs] = useState(() =>
    parseTimeToMs(initialTime),
  );
  const [baseTimestamp, setBaseTimestamp] = useState(() => Date.now());
  const [inputDraft, setInputDraft] = useState(() =>
    formatTime(parseTimeToMs(initialTime)),
  );
  const [isEditing, setIsEditing] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const nextBaseTime = parseTimeToMs(initialTime);
    const nextTimestamp = Date.now();
    setBaseTimeMs(nextBaseTime);
    setBaseTimestamp(nextTimestamp);
    setInputDraft(formatTime(nextBaseTime));
    setNow(nextTimestamp);
  }, [initialTime]);

  useEffect(() => {
    setMotion(secondHandMotion);
  }, [secondHandMotion]);

  useEffect(() => {
    if (!running) {
      return undefined;
    }

    if (motion === "sweep") {
      let frame = 0;
      const animate = () => {
        setNow(Date.now());
        frame = window.requestAnimationFrame(animate);
      };
      frame = window.requestAnimationFrame(animate);

      return () => window.cancelAnimationFrame(frame);
    }

    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 200);

    return () => window.clearInterval(interval);
  }, [motion, running]);

  const timeMs = useMemo(() => {
    const elapsed = running ? now - baseTimestamp : 0;
    return clampDayMs(baseTimeMs + elapsed);
  }, [baseTimeMs, baseTimestamp, now, running]);

  const displayTimeMs =
    motion === "tick" ? Math.floor(timeMs / 1000) * 1000 : timeMs;
  const totalSeconds = displayTimeMs / 1000;
  const seconds = totalSeconds % 60;
  const minutes = (totalSeconds / 60) % 60;
  const hours = (totalSeconds / 3600) % 12;

  const hourRotation = hours * 30;
  const minuteRotation = minutes * 6;
  const secondRotation = seconds * 6;
  const inputValue = formatTime(displayTimeMs);
  const visibleInputValue = isEditing ? inputDraft : inputValue;

  const setTime = (value: string) => {
    const nextBaseTime = parseTimeToMs(value);
    const nextTimestamp = Date.now();
    setBaseTimeMs(nextBaseTime);
    setBaseTimestamp(nextTimestamp);
    setNow(nextTimestamp);
  };

  const handleInputChange = (value: string) => {
    setInputDraft(value);

    if (isValidTimeString(value)) {
      setTime(value);
    }
  };

  return (
    <div className={cn(styles.shell, className)}>
      <div
        aria-label={`Analog clock showing ${inputValue}`}
        className={styles.clock}
        role="img"
        style={{ "--clock-size": `${size}px` } as CSSProperties}
      >
        <div className={styles.case}>
          <div className={styles.face}>
            {NUMBER_MARKS.map((mark) => (
              <span
                className={styles.number}
                key={mark.value}
                style={
                  {
                    "--angle": `${mark.angle}deg`,
                    "--counter-angle": `${mark.angle * -1}deg`,
                  } as CSSProperties
                }
              >
                {mark.value}
              </span>
            ))}
            <span
              className={cn(styles.hand, styles.hourHand)}
              data-clock-hand="hour"
              style={{ "--rotation": `${hourRotation}deg` } as CSSProperties}
            />
            <span
              className={cn(styles.hand, styles.minuteHand)}
              data-clock-hand="minute"
              style={{ "--rotation": `${minuteRotation}deg` } as CSSProperties}
            />
            <span
              className={cn(styles.hand, styles.secondHand)}
              data-clock-hand="second"
              style={{ "--rotation": `${secondRotation}deg` } as CSSProperties}
            />
            <span
              className={styles.secondTail}
              style={{ "--rotation": `${secondRotation}deg` } as CSSProperties}
            />
            <span className={styles.capOuter} />
            <span className={styles.capInner} />
          </div>
        </div>
      </div>

      {showControls ? (
        <div className={styles.controls}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor={inputId}>
              Time
            </label>
            <input
              className={styles.timeInput}
              id={inputId}
              inputMode="numeric"
              onBlur={() => {
                setIsEditing(false);
                setInputDraft(formatTime(displayTimeMs));
              }}
              onChange={(event) => handleInputChange(event.target.value)}
              onFocus={() => {
                setIsEditing(true);
                setInputDraft(formatTime(displayTimeMs));
              }}
              pattern="\d{2}:\d{2}:\d{2}"
              placeholder="HH:MM:SS"
              type="text"
              value={visibleInputValue}
            />
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Second hand</span>
            <div className={styles.motionToggle}>
              {(["tick", "sweep"] as const).map((option) => (
                <button
                  aria-pressed={motion === option}
                  className={cn(
                    styles.motionButton,
                    motion === option && styles.motionButtonActive,
                  )}
                  key={option}
                  onClick={() => setMotion(option)}
                  type="button"
                >
                  {option === "tick" ? "Tick" : "Sweep"}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
