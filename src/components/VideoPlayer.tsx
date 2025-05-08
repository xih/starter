"use client";

import { useState, useEffect, useRef } from "react";
import { Heart, ChevronUp, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "~/lib/utils";
import { Button } from "./ui/button";

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
  const [direction, setDirection] = useState(0); // -1 for up, 1 for down
  const [isAnimating, setIsAnimating] = useState(false);
  const [visibleVideos, setVisibleVideos] = useState<number[]>([0]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get next and previous indices
  const getNextIndex = (index: number) => (index + 1) % videos.length;
  const getPrevIndex = (index: number) =>
    index === 0 ? videos.length - 1 : index - 1;

  const navigateToPrevious = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setDirection(-1);
    const prevIndex = getPrevIndex(currentVideoIndex);
    setCurrentVideoIndex(prevIndex);

    // Update visible videos for stacked effect
    setVisibleVideos((prev) => {
      const newVisible = [prevIndex];
      if (prev.includes(currentVideoIndex)) {
        newVisible.push(currentVideoIndex);
      }
      return newVisible;
    });
  };

  const navigateToNext = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setDirection(1);
    const nextIndex = getNextIndex(currentVideoIndex);
    setCurrentVideoIndex(nextIndex);

    // Update visible videos for stacked effect
    setVisibleVideos((prev) => {
      const newVisible = [nextIndex];
      if (prev.includes(currentVideoIndex)) {
        newVisible.push(currentVideoIndex);
      }
      return newVisible;
    });
  };

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Navigate videos with arrow keys
      if (e.key === "ArrowUp") {
        navigateToPrevious();
      } else if (e.key === "ArrowDown") {
        navigateToNext();
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
  }, [isAnimating, navigateToNext, navigateToPrevious]);

  // Ensure currentVideoIndex is within bounds
  const safeVideoIndex = Math.min(
    Math.max(0, currentVideoIndex),
    videos.length - 1,
  );
  const currentVideo = videos[safeVideoIndex] ?? fallbackVideo;

  // Animation variants for stacked effect
  const variants = {
    // Entering from bottom (next video)
    enterFromBottom: {
      y: "100%",
      opacity: 0,
      scale: 0.8,
      zIndex: 0,
      rotateX: 10,
    },
    // Entering from top (previous video)
    enterFromTop: {
      y: "-100%",
      opacity: 0,
      scale: 0.8,
      zIndex: 0,
      rotateX: -10,
    },
    // Current video in center
    center: {
      y: 0,
      opacity: 1,
      scale: 1,
      zIndex: 10,
      rotateX: 0,
      transition: {
        y: { type: "spring", stiffness: 300, damping: 30 },
        opacity: { duration: 0.3 },
        scale: { duration: 0.4, ease: "easeOut" },
        rotateX: { duration: 0.4, ease: "easeOut" },
      },
    },
    // Exiting to top (when navigating to previous)
    exitToTop: {
      y: "-100%",
      opacity: 0.5,
      scale: 0.9,
      zIndex: 5,
      rotateX: -10,
      transition: {
        y: { type: "spring", stiffness: 200, damping: 30 },
        opacity: { duration: 0.4 },
        scale: { duration: 0.4, ease: "easeIn" },
        rotateX: { duration: 0.4, ease: "easeIn" },
      },
    },
    // Exiting to bottom (when navigating to next)
    exitToBottom: {
      y: "100%",
      opacity: 0,
      scale: 0.8,
      zIndex: 0,
      rotateX: 10,
      transition: {
        y: { type: "spring", stiffness: 200, damping: 30 },
        opacity: { duration: 0.4 },
        scale: { duration: 0.4, ease: "easeIn" },
        rotateX: { duration: 0.4, ease: "easeIn" },
      },
    },
    // Stacked below current (visible in background)
    stackedBelow: {
      y: "20%",
      opacity: 0.5,
      scale: 0.9,
      zIndex: 5,
      rotateX: 10,
      transition: {
        y: { type: "spring", stiffness: 200, damping: 30 },
        opacity: { duration: 0.4 },
        scale: { duration: 0.4 },
        rotateX: { duration: 0.4 },
      },
    },
  };

  return (
    <div className="relative flex h-full w-full items-center justify-center">
      {/* Navigation buttons */}
      <Button
        variant="secondary"
        size="icon"
        className="absolute left-1/2 top-8 z-20 -translate-x-1/2 rounded-full bg-white/80 shadow-md hover:bg-white/90"
        onClick={navigateToPrevious}
        disabled={isAnimating}
      >
        <ChevronUp className="h-5 w-5" />
      </Button>

      {/* Mobile-like container with proper aspect ratio */}
      <div
        ref={containerRef}
        className="relative h-[calc(100vh-120px)] max-h-[800px] w-full max-w-[400px] overflow-visible"
      >
        {/* Container for stacked videos */}
        <div className="perspective-1000 relative h-full w-full">
          <AnimatePresence
            initial={false}
            custom={direction}
            onExitComplete={() => {
              setIsAnimating(false);
            }}
          >
            {/* Current video */}
            <motion.div
              key={`video-${currentVideoIndex}`}
              custom={direction}
              variants={variants}
              initial={direction > 0 ? "enterFromBottom" : "enterFromTop"}
              animate="center"
              exit={direction < 0 ? "exitToTop" : "exitToBottom"}
              className="transform-3d absolute inset-0 rounded-2xl bg-gray-400 shadow-lg"
            >
              {/* Video content */}
              <div className="flex h-full w-full items-center justify-center">
                <div className="text-xl font-medium text-white">
                  {currentVideo.title}
                  {isMuted && <span className="ml-2">(Muted)</span>}
                </div>

                {/* Heart animation */}
                {showHeart && (
                  <div
                    className="absolute animate-heart-pop"
                    style={{
                      left: `${heartPosition.x}%`,
                      top: `${heartPosition.y}%`,
                    }}
                  >
                    <Heart className="h-16 w-16 fill-red-500 text-red-500" />
                  </div>
                )}

                {/* Video navigation indicator */}
                <div className="absolute right-4 top-4 rounded-full bg-black/50 px-3 py-1 text-white">
                  {safeVideoIndex + 1} / {videos.length}
                </div>
              </div>
            </motion.div>

            {/* Show stacked video below */}
            {direction === -1 && (
              <motion.div
                key={`stacked-below-${getNextIndex(currentVideoIndex)}`}
                initial={{
                  y: "100%",
                  opacity: 0,
                  scale: 0.8,
                  zIndex: 0,
                  rotateX: 10,
                }}
                animate="stackedBelow"
                variants={variants}
                className="transform-3d absolute inset-0 rounded-2xl bg-gray-500 shadow-lg"
              >
                <div className="flex h-full w-full items-center justify-center">
                  <div className="text-xl font-medium text-white opacity-50">
                    {videos[getNextIndex(currentVideoIndex)]?.title}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation buttons */}
      <Button
        variant="secondary"
        size="icon"
        className="absolute bottom-8 left-1/2 z-20 -translate-x-1/2 rounded-full bg-white/80 shadow-md hover:bg-white/90"
        onClick={navigateToNext}
        disabled={isAnimating}
      >
        <ChevronDown className="h-5 w-5" />
      </Button>
    </div>
  );
}
