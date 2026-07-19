"use client";

const MOBILE_ASK_RESUME_STORAGE_KEY = "portfolio.mobileAskResume";
const MOBILE_ASK_RESUME_TTL_MS = 5 * 60 * 1000;

type MobileAskResumeRecord = {
  connectedAt: number;
  expiresAt: number;
};

function readResumeRecord() {
  try {
    const value = window.localStorage.getItem(MOBILE_ASK_RESUME_STORAGE_KEY);
    if (!value) return null;

    const parsed = JSON.parse(value) as Partial<MobileAskResumeRecord>;
    if (
      typeof parsed.connectedAt !== "number" ||
      typeof parsed.expiresAt !== "number"
    ) {
      return null;
    }

    return parsed as MobileAskResumeRecord;
  } catch {
    return null;
  }
}

export function markMobileAskResumeActive() {
  const now = Date.now();

  window.localStorage.setItem(
    MOBILE_ASK_RESUME_STORAGE_KEY,
    JSON.stringify({
      connectedAt: now,
      expiresAt: now + MOBILE_ASK_RESUME_TTL_MS,
    } satisfies MobileAskResumeRecord),
  );
}

export function clearMobileAskResume() {
  window.localStorage.removeItem(MOBILE_ASK_RESUME_STORAGE_KEY);
}

export function hasActiveMobileAskResume() {
  const record = readResumeRecord();

  if (!record) {
    clearMobileAskResume();
    return false;
  }

  if (record.expiresAt <= Date.now()) {
    clearMobileAskResume();
    return false;
  }

  return true;
}
