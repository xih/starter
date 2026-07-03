import React from "react";
import MidjourneyCard from "~/components/MidjourneyCard";

export default function page() {
  return (
    <div>
      <h1>Midjourney</h1>
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <MidjourneyCard
          entityId="1"
          threatLevel="HIGH"
          status="ACTIVE"
          location="UNKNOWN"
        />
      </div>
    </div>
  );
}
