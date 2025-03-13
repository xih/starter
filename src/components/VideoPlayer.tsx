"use client";

import { useState, useEffect } from "react";
import { Heart } from "lucide-react";
import { cn } from "~/lib/utils";

// Sample video data
const videos = [
  { id: 1, title: "Video 1" },
  { id: 2, title: "Video 2" },
  { id: 3, title: "Video 3" },
  { id: 4, title: "Video 4" },
  { id: 5, title: "Video 5" },
];

// Fallback video in case of errors
const fallbackVideo = { id: 0, title: "Video Unavailable" };

export function VideoPlayer() {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [showHeart, setShowHeart] = useState(false);
  const [heartPosition, setHeartPosition] = useState({ x: 0, y: 0 });
  const [isMuted, setIsMuted] = useState(false);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Navigate videos with arrow keys
      if (e.key === "ArrowUp") {
        setCurrentVideoIndex((prev) =>
          prev === 0 ? videos.length - 1 : prev - 1,
        );
      } else if (e.key === "ArrowDown") {
        setCurrentVideoIndex((prev) => (prev + 1) % videos.length);
      }
      // Like video with "L" key
      else if (e.key.toLowerCase() === "l") {
        // Generate random position for the heart
        const x = Math.random() * 60 + 20; // 20-80% of width
        const y = Math.random() * 60 + 20; // 20-80% of height
        setHeartPosition({ x, y });
        setShowHeart(true);

        // Hide heart after animation
        setTimeout(() => {
          setShowHeart(false);
        }, 1000);
      }
      // Mute/unmute with "M" key
      else if (e.key.toLowerCase() === "m") {
        setIsMuted((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Ensure currentVideoIndex is within bounds
  const safeVideoIndex = Math.min(
    Math.max(0, currentVideoIndex),
    videos.length - 1,
  );
  const currentVideo = videos[safeVideoIndex] ?? fallbackVideo;

  return (
    <div className="relative h-full w-full">
      {/* Video placeholder */}
      <div className="relative flex h-full w-full items-center justify-center bg-gray-300">
        <div className="text-xl font-medium text-gray-600">
          {currentVideo.title}
          {isMuted && <span className="ml-2">(Muted)</span>}
        </div>

        {/* Heart animation */}
        {showHeart && (
          <div
            className="animate-heart-pop absolute"
            style={{
              left: `${heartPosition.x}%`,
              top: `${heartPosition.y}%`,
            }}
          >
            <Heart className="h-16 w-16 fill-red-500 text-red-500" />
          </div>
        )}
      </div>

      {/* Video navigation indicator */}
      <div className="absolute right-4 top-4 rounded-full bg-black/50 px-3 py-1 text-white">
        {safeVideoIndex + 1} / {videos.length}
      </div>
    </div>
  );
}
