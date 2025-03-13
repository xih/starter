"use client";

import { useState, useEffect, useRef } from "react";
import { Heart, ChevronUp, ChevronDown, Gift } from "lucide-react";
import { motion, AnimatePresence, useMotionValue } from "framer-motion";
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

// SVG icons for crypto
const BitcoinIcon = () => (
  <svg
    viewBox="0 0 24 24"
    width="24"
    height="24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="h-6 w-6"
  >
    <path
      d="M23.638 14.904c-1.602 6.43-8.113 10.34-14.542 8.736C2.67 22.05-1.244 15.525.362 9.105 1.962 2.67 8.475-1.243 14.9.358c6.43 1.605 10.342 8.115 8.738 14.548v-.002zm-6.35-4.613c.24-1.59-.974-2.45-2.64-3.03l.54-2.153-1.315-.33-.525 2.107c-.345-.087-.705-.167-1.064-.25l.526-2.127-1.32-.33-.54 2.165c-.285-.067-.565-.132-.84-.2l-1.815-.45-.35 1.4s.975.225.955.236c.535.136.63.486.615.766l-1.477 5.92c-.075.166-.24.415-.614.32.015.02-.96-.24-.96-.24l-.66 1.51 1.71.426.93.242-.54 2.19 1.32.327.54-2.17c.36.1.705.19 1.05.273l-.51 2.154 1.32.33.545-2.19c2.24.427 3.93.257 4.64-1.774.57-1.637-.03-2.58-1.217-3.196.854-.193 1.5-.76 1.68-1.93h.01zm-3.01 4.22c-.404 1.64-3.157.75-4.05.53l.72-2.9c.896.23 3.757.67 3.33 2.37zm.41-4.24c-.37 1.49-2.662.735-3.405.55l.654-2.64c.744.18 3.137.52 2.75 2.084v.006z"
      fill="#F7931A"
    />
  </svg>
);

const SolanaIcon = () => (
  <svg
    viewBox="0 0 24 24"
    width="24"
    height="24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="h-6 w-6"
  >
    <path
      d="M17.24 9.518a.547.547 0 00-.39-.162H4.2a.274.274 0 00-.195.468l2.364 2.364a.547.547 0 00.39.162h12.651a.274.274 0 00.195-.468l-2.365-2.364zm0-5.388a.547.547 0 00-.39-.162H4.2a.274.274 0 00-.195.468l2.364 2.364a.547.547 0 00.39.162h12.651a.274.274 0 00.195-.468L17.24 4.13zm.195 8.45H4.784a.547.547 0 00-.39.162l-2.365 2.365a.274.274 0 00.195.468h12.651a.547.547 0 00.39-.162l2.365-2.365a.274.274 0 00-.195-.468z"
      fill="#00FFA3"
    />
  </svg>
);

// Type for red envelope objects
interface RedEnvelope {
  id: number;
  amount: number;
}

export function VideoPlayer() {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [showHeart, setShowHeart] = useState(false);
  const [heartPosition, setHeartPosition] = useState({ x: 0, y: 0 });
  const [isMuted, setIsMuted] = useState(false);
  const [direction, setDirection] = useState(0); // -1 for up, 1 for down
  const [isAnimating, setIsAnimating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLDivElement>(null);
  const videoContentRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLDivElement>(null);
  const counterContainerRef = useRef<HTMLDivElement>(null);

  // Animation target position states
  const [targetPosition, setTargetPosition] = useState({
    x: "-250px",
    y: "0px",
  });

  // Video center position for animations
  const [videoCenterPosition, setVideoCenterPosition] = useState({
    x: 0,
    y: 0,
  });

  // Gamification states
  const [viewCount, setViewCount] = useState(0);
  const [redEnvelopes, setRedEnvelopes] = useState<RedEnvelope[]>([]);
  const [nextEnvelopeId, setNextEnvelopeId] = useState(1);
  const [showJackpot, setShowJackpot] = useState(false);
  const [moneyEarned, setMoneyEarned] = useState(0);
  const [jackpotCount, setJackpotCount] = useState(0);
  const [counterHighlight, setCounterHighlight] = useState(false);
  const [counterPulse, setCounterPulse] = useState(false);

  // Calculate counter and video center positions when component mounts and on window resize
  useEffect(() => {
    const calculatePositions = () => {
      // Calculate counter position
      if (counterRef.current && containerRef.current) {
        const counterRect = counterRef.current.getBoundingClientRect();
        const containerRect = containerRef.current.getBoundingClientRect();

        // Calculate the position relative to the center of the screen
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;

        // Calculate the difference between counter and center
        const xDiff = counterRect.left + counterRect.width / 2 - centerX;
        const yDiff = counterRect.top + counterRect.height / 2 - centerY;

        // Set the target position
        setTargetPosition({
          x: `${xDiff}px`,
          y: `${yDiff}px`,
        });
      }

      // Calculate video center position
      if (videoContentRef.current) {
        const videoRect = videoContentRef.current.getBoundingClientRect();

        setVideoCenterPosition({
          x: videoRect.width / 2,
          y: videoRect.height / 2,
        });

        console.log("Video center position:", {
          x: videoRect.width / 2,
          y: videoRect.height / 2,
        });
      }
    };

    // Calculate on mount
    calculatePositions();

    // Recalculate on window resize
    window.addEventListener("resize", calculatePositions);

    return () => {
      window.removeEventListener("resize", calculatePositions);
    };
  }, []);

  // Get next and previous indices
  const getNextIndex = (index: number) => (index + 1) % videos.length;
  const getPrevIndex = (index: number) =>
    index === 0 ? videos.length - 1 : index - 1;

  const navigateToPrevious = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setDirection(-1);
    setCurrentVideoIndex(getPrevIndex(currentVideoIndex));
  };

  // Function to create a new red envelope
  const createRedEnvelope = () => {
    const newEnvelope: RedEnvelope = {
      id: nextEnvelopeId,
      amount: 0.05,
    };

    setRedEnvelopes((prev) => [...prev, newEnvelope]);
    setNextEnvelopeId((prev) => prev + 1);

    // Increment view count and trigger rewards
    const newViewCount = viewCount + 1;
    setViewCount(newViewCount);

    // Schedule removal of this envelope
    setTimeout(() => {
      setRedEnvelopes((prev) =>
        prev.filter((env) => env.id !== newEnvelope.id),
      );

      // Trigger counter effects
      setCounterPulse(true);
      setTimeout(() => {
        setCounterPulse(false);
        // Add money after animation
        setMoneyEarned((prev) => prev + newEnvelope.amount);
        // Highlight counter
        setCounterHighlight(true);
        setTimeout(() => setCounterHighlight(false), 1000);
      }, 200);
    }, 100);

    // Check for jackpot (every 5 views)
    if (newViewCount % 5 === 0) {
      setTimeout(() => {
        setShowJackpot(true);
        setTimeout(() => {
          setShowJackpot(false);
          setJackpotCount((prev) => prev + 1);
        }, 2000);
      }, 200); // Show jackpot after red envelope animation
    }
  };

  const navigateToNext = () => {
    setIsAnimating(true);
    setDirection(1);
    setCurrentVideoIndex(getNextIndex(currentVideoIndex));

    // Recalculate positions before showing the envelope
    if (counterRef.current && videoContentRef.current) {
      const counterRect = counterRef.current.getBoundingClientRect();
      const videoRect = videoContentRef.current.getBoundingClientRect();

      // Calculate the position relative to the center of the screen
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;

      // Calculate the difference between counter and center
      const xDiff = counterRect.left + counterRect.width / 2 - centerX;
      const yDiff = counterRect.top + counterRect.height / 2 - centerY;

      // Set the target position
      setTargetPosition({
        x: `${xDiff}px`,
        y: `${yDiff}px`,
      });

      // Update video center position
      setVideoCenterPosition({
        x: videoRect.width / 2,
        y: videoRect.height / 2,
      });
    }

    // Create a new red envelope
    createRedEnvelope();

    // Allow next animation after a short delay
    setTimeout(() => {
      setIsAnimating(false);
    }, 100);
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
  }, [isAnimating, viewCount]);

  // Ensure currentVideoIndex is within bounds
  const safeVideoIndex = Math.min(
    Math.max(0, currentVideoIndex),
    videos.length - 1,
  );
  const currentVideo = videos[safeVideoIndex] ?? fallbackVideo;

  // Animation variants with absolute viewport positioning
  const variants = {
    enter: (direction: number) => ({
      y: direction > 0 ? "100vh" : "-100vh",
      opacity: 0,
    }),
    center: {
      y: 0,
      opacity: 1,
      transition: {
        y: { type: "spring", stiffness: 300, damping: 30 },
        opacity: { duration: 0.1 },
      },
    },
    exit: (direction: number) => ({
      y: direction < 0 ? "100vh" : "-100vh",
      opacity: 0,
      transition: {
        y: { type: "spring", stiffness: 300, damping: 30 },
        opacity: { duration: 0.3 },
      },
    }),
  };

  // Red envelope animation variants
  const redEnvelopeVariants = {
    initial: {
      scale: 0.5,
      opacity: 0,
      x: 0,
      y: 0,
      rotate: -5,
      zIndex: 50,
    },
    animate: {
      scale: 1.2,
      opacity: 1,
      x: 0,
      y: 0,
      rotate: 5,
      zIndex: 50,
      transition: {
        duration: 0.1,
        rotate: {
          yoyo: 3,
          duration: 0.2,
        },
      },
    },
    exit: {
      scale: 0.7,
      opacity: 0,
      x: targetPosition.x,
      y: targetPosition.y,
      rotate: -5,
      zIndex: 50,
      transition: {
        duration: 1,
        ease: "easeInOut",
        x: {
          type: "spring",
          stiffness: 80,
          damping: 15,
          restDelta: 0.001,
        },
        y: {
          type: "spring",
          stiffness: 80,
          damping: 15,
          restDelta: 0.001,
        },
      },
    },
  };

  // Jackpot animation variants
  const jackpotVariants = {
    initial: {
      scale: 0.5,
      opacity: 0,
      rotate: -10,
    },
    animate: {
      scale: 2,
      opacity: 1,
      rotate: 10,
      transition: {
        duration: 0.5,
        rotate: {
          yoyo: 5,
          duration: 0.2,
        },
      },
    },
    exit: {
      scale: 0.8,
      opacity: 0,
      y: -100,
      transition: { duration: 0.5 },
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

      {/* Gamification widget */}
      <div
        ref={counterContainerRef}
        className="absolute left-4 top-1/2 z-20 flex -translate-y-1/2 flex-col items-center gap-2"
      >
        {/* Red envelope for money */}
        <div className="flex flex-col items-center">
          <div className="rounded-md bg-red-500 px-4 py-2 text-center font-bold text-white shadow-lg">
            已打赏
          </div>
          <div
            ref={counterRef}
            className={cn(
              "mt-1 rounded-md bg-white px-4 py-1 text-center font-bold shadow-lg transition-all duration-300",
              counterHighlight && "scale-110 bg-yellow-100",
              counterPulse && "animate-pulse bg-red-100 ring-2 ring-red-500",
            )}
          >
            {moneyEarned.toFixed(2)}
          </div>
          <div className="mt-1 rounded-md bg-red-500 px-4 py-2 text-center font-bold text-white shadow-lg">
            已打赏
          </div>
        </div>

        {/* Jackpot indicators */}
        <div className="mt-2 flex flex-col items-center">
          <div className="flex items-center gap-1 rounded-md bg-red-500 px-4 py-2 text-center font-bold text-white shadow-lg">
            <Gift className="h-4 w-4" /> 上滑1次
          </div>
          <div className="mt-2 flex items-center gap-1 rounded-md bg-red-500 px-4 py-2 text-center font-bold text-white shadow-lg">
            <Gift className="h-4 w-4" /> 上滑5次
          </div>
        </div>
      </div>

      {/* Mobile-like container with proper aspect ratio */}
      <div
        ref={containerRef}
        className="relative h-[calc(100vh-120px)] max-h-[800px] w-full max-w-[400px]"
      >
        {/* Overflow container for animation */}
        <div ref={videoRef} className="absolute inset-0 overflow-visible">
          <AnimatePresence
            initial={false}
            custom={direction}
            onExitComplete={() => setIsAnimating(false)}
          >
            <motion.div
              key={currentVideoIndex}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              className="absolute inset-0 rounded-2xl bg-gray-400 shadow-lg"
              style={{
                position: "absolute",
                width: "100%",
                height: "100%",
              }}
            >
              {/* Video content */}
              <div
                ref={videoContentRef}
                className="flex h-full w-full items-center justify-center"
              >
                <div className="text-xl font-medium text-white">
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

                {/* Video navigation indicator */}
                <div className="absolute right-4 top-4 rounded-full bg-black/50 px-3 py-1 text-white">
                  {safeVideoIndex + 1} / {videos.length}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Multiple red envelopes - positioned in the center of the video */}
      <AnimatePresence>
        {redEnvelopes.map((envelope) => (
          <motion.div
            key={envelope.id}
            className="pointer-events-none fixed z-30"
            style={{
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
            }}
            variants={redEnvelopeVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <div className="flex flex-col items-center justify-center rounded-md bg-red-600 p-4 shadow-lg">
              <div className="mb-1 text-lg font-bold text-yellow-300">红包</div>
              <div className="flex items-center justify-center gap-2">
                <BitcoinIcon />
                <SolanaIcon />
              </div>
              <div className="mt-1 text-sm font-bold text-yellow-300">
                +{envelope.amount.toFixed(2)}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Jackpot animation - positioned in the center of the video */}
      <AnimatePresence>
        {showJackpot && (
          <motion.div
            className="pointer-events-none fixed z-40"
            style={{
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
            }}
            variants={jackpotVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <div className="flex flex-col items-center justify-center rounded-lg bg-red-600 p-6 shadow-lg">
              <span className="text-2xl font-bold text-white">JACKPOT!</span>
              <Gift className="mt-2 h-12 w-12 text-yellow-300" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
