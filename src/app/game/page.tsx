"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Loader } from "@/components/ui/loader";

// Dynamically import the 3D scene to avoid SSR issues
const DynamicTerrainScene = dynamic(
  () => import("@/components/game/TerrainScene"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader size="lg" />
        <span className="ml-2 text-lg">Loading 3D Environment...</span>
      </div>
    ),
  },
);

// Onboarding component to show instructions
const Onboarding = ({ onClose }: { onClose: () => void }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
        <h2 className="mb-4 text-2xl font-bold">How to Play</h2>
        <ul className="mb-6 list-disc pl-5">
          <li className="mb-2">
            Use{" "}
            <span className="bg-gray-100 px-1 font-mono dark:bg-gray-700">
              W
            </span>
            ,{" "}
            <span className="bg-gray-100 px-1 font-mono dark:bg-gray-700">
              A
            </span>
            ,{" "}
            <span className="bg-gray-100 px-1 font-mono dark:bg-gray-700">
              S
            </span>
            ,{" "}
            <span className="bg-gray-100 px-1 font-mono dark:bg-gray-700">
              D
            </span>{" "}
            keys to move your character
          </li>
          <li className="mb-2">Walk through the snow to create footprints</li>
          <li className="mb-2">
            Explore the environment and enjoy the dynamic terrain deformation
          </li>
        </ul>
        <button
          onClick={onClose}
          className="w-full rounded-md bg-blue-600 py-2 text-white transition hover:bg-blue-700"
        >
          Start Playing
        </button>
      </div>
    </div>
  );
};

export default function GamePage() {
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null;
  }

  return (
    <div className="h-screen w-full">
      {showOnboarding && (
        <Onboarding onClose={() => setShowOnboarding(false)} />
      )}
      <DynamicTerrainScene />
    </div>
  );
}
