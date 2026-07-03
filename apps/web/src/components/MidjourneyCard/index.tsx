"use client";

import React, { useState } from "react";

interface MidjourneyCardProps {
  entityId: string;
  threatLevel: "LOW" | "MEDIUM" | "HIGH";
  status: "ACTIVE" | "INACTIVE";
  location: string;
  age?: string;
  height?: string;
  weight?: string;
  videoSrc?: string;
  imageSrc?: string;
  ref?: string;
}

const MidjourneyCard: React.FC<MidjourneyCardProps> = ({
  entityId,
  threatLevel,
  status,
  location,
  age = "UNKNOWN",
  height = "250cm",
  weight = "300kg",
  videoSrc = "/placeholder-video.mp4",
  imageSrc = "/placeholder-image.jpg",
  ref = "",
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const getThreatLevelColor = (level: string) => {
    switch (level) {
      case "HIGH":
        return "text-red-500";
      case "MEDIUM":
        return "text-yellow-500";
      case "LOW":
        return "text-green-500";
      default:
        return "text-red-500";
    }
  };

  return (
    <div
      className="relative h-[380px] w-[380px] cursor-pointer overflow-hidden rounded-2xl bg-neutral-700 shadow-lg transition-transform duration-300 ease-in-out hover:scale-[1.02]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Background Video */}
      <video
        className="absolute z-0 h-full w-full object-cover opacity-20"
        autoPlay
        muted
        loop
      >
        <source src={videoSrc} type="video/mp4" />
      </video>

      {/* Content Container */}
      <div className="relative z-10 flex h-full w-full flex-col p-4 font-mono text-white">
        {/* Header */}
        <div className="mb-2 flex items-start justify-between">
          <div className="text-sm opacity-70">
            entity:
            <br />
            {entityId}
          </div>
          <div>
            <div className={`text-sm ${getThreatLevelColor(threatLevel)}`}>
              threat-level:
              <br />
              {threatLevel}
            </div>

            <div className="mt-1 text-right">
              <div className="text-sm opacity-70">status:</div>
              <div className="text-sm text-green-400">{status}</div>
            </div>

            <div className="mt-2 text-right">
              <div className="text-sm opacity-70">location:</div>
              <div className="text-sm">{location}</div>
            </div>
          </div>
        </div>

        {!isHovered ? (
          <div className="mx-auto my-4 h-60 w-60 overflow-hidden rounded-lg">
            <img
              src={imageSrc}
              alt="Subject"
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="mx-auto mt-4 h-60 w-60 overflow-hidden rounded-lg">
              <img
                src={imageSrc}
                alt="Subject"
                className="h-full w-full object-cover"
              />
            </div>

            <div className="mt-4 flex w-full justify-between">
              <div className="flex flex-col gap-2">
                <div className="flex w-[200px] justify-between">
                  <div className="text-sm opacity-70">AGE:</div>
                  <div className="text-right text-sm">{age}</div>
                </div>
                <div className="flex w-[200px] justify-between">
                  <div className="text-sm opacity-70">HEIGHT:</div>
                  <div className="text-right text-sm">{height}</div>
                </div>
                <div className="flex w-[200px] justify-between">
                  <div className="text-sm opacity-70">WEIGHT:</div>
                  <div className="text-right text-sm">{weight}</div>
                </div>

                {/* Barcode */}
                <div className="my-3 h-10 w-[200px] bg-[repeating-linear-gradient(to_right,white_0px,white_2px,transparent_2px,transparent_4px)]"></div>
              </div>

              <div className="h-[100px] w-[100px] overflow-hidden rounded">
                <img
                  src={imageSrc}
                  alt="Location Thumbnail"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-auto flex items-center justify-between">
          <div className="text-sm opacity-70">REF:</div>
          <div className="text-sm">{ref || `${entityId}_CEPHALON`}</div>
        </div>
      </div>
    </div>
  );
};

export default MidjourneyCard;
