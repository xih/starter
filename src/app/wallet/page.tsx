"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Gift } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Sidebar } from "~/components/Sidebar";

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

export default function WalletPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [redEnvelopes, setRedEnvelopes] = useState<RedEnvelope[]>([]);
  const [nextEnvelopeId, setNextEnvelopeId] = useState(1);
  const [moneyEarned, setMoneyEarned] = useState(0);
  const [counterHighlight, setCounterHighlight] = useState(false);
  const [counterPulse, setCounterPulse] = useState(false);
  const [counterPosition, setCounterPosition] = useState({ x: 0, y: 0 });
  const [phonePosition, setPhonePosition] = useState({ x: 0, y: 0 });

  const counterRef = useRef<HTMLDivElement>(null);
  const phoneRef = useRef<HTMLDivElement>(null);

  // Calculate counter position when component mounts and on window resize
  useEffect(() => {
    const calculatePositions = () => {
      if (counterRef.current && phoneRef.current) {
        const counterRect = counterRef.current.getBoundingClientRect();
        const phoneRect = phoneRef.current.getBoundingClientRect();

        // Store the absolute positions in the viewport
        setCounterPosition({
          x: counterRect.left + counterRect.width / 2,
          y: counterRect.top + counterRect.height / 2,
        });

        setPhonePosition({
          x: phoneRect.left + phoneRect.width / 2,
          y: phoneRect.top + phoneRect.height / 2,
        });
      }
    };

    // Initial calculation
    calculatePositions();

    // Recalculate on resize
    window.addEventListener("resize", calculatePositions);

    // Recalculate after a short delay to ensure all elements are properly rendered
    const timer = setTimeout(calculatePositions, 500);

    return () => {
      window.removeEventListener("resize", calculatePositions);
      clearTimeout(timer);
    };
  }, []);

  const toggleBottomSheet = () => {
    setIsOpen(!isOpen);
  };

  // Function to create a new red envelope
  const createRedEnvelope = () => {
    const newEnvelope: RedEnvelope = {
      id: nextEnvelopeId,
      amount: 0.05,
    };

    setRedEnvelopes((prev) => [...prev, newEnvelope]);
    setNextEnvelopeId((prev) => prev + 1);

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
    }, 1000);
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
      x: counterPosition.x - phonePosition.x,
      y: counterPosition.y - phonePosition.y,
      rotate: -5,
      zIndex: 50,
      transition: {
        duration: 0.8,
        ease: "easeInOut",
        x: {
          type: "spring",
          stiffness: 100,
          damping: 12,
          restDelta: 0.001,
        },
        y: {
          type: "spring",
          stiffness: 100,
          damping: 12,
          restDelta: 0.001,
        },
      },
    },
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar - only visible on larger screens */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="relative flex flex-1 items-center justify-center bg-gray-50 p-4">
        {/* Wallet counter */}
        <div className="absolute left-4 top-1/2 z-20 flex -translate-y-1/2 flex-col items-center gap-2">
          {/* Red envelope for money */}
          <div className="flex flex-col items-center">
            <div className="rounded-md bg-red-500 px-4 py-2 text-center font-bold text-white shadow-lg">
              已打赏
            </div>
            <div
              ref={counterRef}
              className={`mt-1 rounded-md bg-white px-4 py-1 text-center font-bold shadow-lg transition-all duration-300 ${
                counterHighlight ? "scale-110 bg-yellow-100" : ""
              } ${
                counterPulse
                  ? "animate-pulse bg-red-100 ring-2 ring-red-500"
                  : ""
              }`}
            >
              {moneyEarned.toFixed(2)}
            </div>
            <div className="mt-1 rounded-md bg-red-500 px-4 py-2 text-center font-bold text-white shadow-lg">
              已打赏
            </div>
          </div>
        </div>

        <div
          ref={phoneRef}
          className="iphone-frame relative h-[812px] w-[375px] overflow-hidden rounded-[55px] bg-black p-4 shadow-xl"
        >
          {/* iPhone Screen Content - Removed status bar */}
          <div className="screen relative h-full overflow-hidden rounded-[40px] bg-[#f2f2f7]">
            <div className="app-content relative flex h-full flex-col items-center justify-center p-6">
              <div className="mb-8 text-center">
                <h1 className="mb-2 text-2xl font-bold">Wallet</h1>
                <p className="mb-6 text-gray-600">
                  Send red envelopes to earn rewards
                </p>

                <Button
                  onClick={createRedEnvelope}
                  className="rounded-full bg-red-500 px-6 py-2 font-medium text-white hover:bg-red-600"
                >
                  Send Red Envelope
                </Button>

                <Button
                  onClick={toggleBottomSheet}
                  className="mt-4 rounded-full bg-blue-500 px-6 py-2 font-medium text-white hover:bg-blue-600"
                >
                  View Transactions
                </Button>
              </div>

              {/* Home Indicator */}
              <div className="absolute bottom-2 left-1/2 h-1 w-[120px] -translate-x-1/2 transform rounded-full bg-black opacity-30"></div>

              {/* Bottom Sheet */}
              <AnimatePresence>
                {isOpen && (
                  <>
                    {/* Backdrop */}
                    <motion.div
                      className="absolute inset-0 z-30 bg-black/40"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={toggleBottomSheet}
                    />

                    {/* Sheet */}
                    <motion.div
                      className="absolute bottom-0 left-0 right-0 z-40 rounded-t-3xl bg-white p-6"
                      initial={{ y: "100%" }}
                      animate={{ y: 0 }}
                      exit={{ y: "100%" }}
                      transition={{
                        type: "spring",
                        damping: 20,
                        stiffness: 300,
                        mass: 0.8,
                      }}
                    >
                      <div className="mb-6 flex items-center justify-between">
                        <h2 className="text-xl font-bold">Transactions</h2>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={toggleBottomSheet}
                          className="h-8 w-8 rounded-full"
                        >
                          <X className="h-5 w-5" />
                        </Button>
                      </div>

                      <div className="space-y-4">
                        <p className="text-gray-600">
                          Your recent transaction history
                        </p>

                        <div className="mt-4 space-y-3">
                          {[1, 2, 3].map((item) => (
                            <motion.div
                              key={item}
                              className="flex items-center justify-between rounded-xl bg-gray-100 p-3"
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{
                                delay: 0.05 * item,
                                duration: 0.3,
                              }}
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                                  <Gift className="h-5 w-5 text-red-500" />
                                </div>
                                <div>
                                  <p className="font-medium">Red Envelope</p>
                                  <p className="text-sm text-gray-500">
                                    {new Date().toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <p className="font-medium text-green-500">
                                +0.05
                              </p>
                            </motion.div>
                          ))}
                        </div>

                        <Button
                          className="mt-6 w-full bg-blue-500 hover:bg-blue-600"
                          onClick={toggleBottomSheet}
                        >
                          Close
                        </Button>
                      </div>

                      {/* Bottom sheet indicator */}
                      <div className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 transform rounded-full bg-gray-300"></div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Multiple red envelopes - positioned in the center of the phone */}
        <AnimatePresence>
          {redEnvelopes.map((envelope) => (
            <motion.div
              key={envelope.id}
              className="pointer-events-none fixed z-30"
              style={{
                top: phonePosition.y,
                left: phonePosition.x,
                transform: "translate(-50%, -50%)",
              }}
              variants={redEnvelopeVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <div className="flex flex-col items-center justify-center rounded-md bg-red-600 p-4 shadow-lg">
                <div className="mb-1 text-lg font-bold text-yellow-300">
                  红包
                </div>
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
      </div>
    </div>
  );
}
