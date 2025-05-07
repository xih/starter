// index.tsx — REPLACED file
"use client";

import { useState, useMemo } from "react";
import { Drawer } from "vaul";
import { motion } from "framer-motion";
import useMeasure from "react-use-measure";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import {
  OptionLink, //  ← new helper
} from "./components";
import {
  LockIcon,
  PhraseIcon,
  WarningIcon,
  FaceIDIcon,
  ShieldIcon,
  PassIcon,
  BannedIcon,
  DangerIcon,
} from "./icons";
import { CloseIcon } from "./icons";

type WalletOption = {
  label: string;
  icon: JSX.Element;
  href: string;
  variant?: "default" | "danger";
};

// 🔑  All menu items live in ONE array — easy to reorder / extend.
const walletOptions: WalletOption[] = [
  // five “generic” items – replace / extend at will
  {
    label: "Tweet",
    icon: <FaceIDIcon />,
    href: "/shaders2/tweet",
  },
  {
    label: "Seascape",
    icon: <LockIcon />,
    href: "/shaders2/seascape",
  },
  {
    label: "Water",
    icon: <ShieldIcon />,
    href: "/shaders2/water",
  },
  {
    label: "Protean Clouds",
    icon: <PassIcon />,
    href: "/shaders2/proteanClouds",
  },
  {
    label: "DVD Shader",
    icon: <BannedIcon />,
    href: "/shaders2/dvd",
  },
  // {
  //   label: "Remove Wallet",
  //   icon: <WarningIcon />,
  //   href: "/wallet/remove",
  //   variant: "danger",
  // },
];

export default function WalletOptionsDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [ref, bounds] = useMeasure();

  // dynamically build an accessible drawer title
  const dialogTitle = useMemo(() => "Shaders", []);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="focus-visible:shadow-focus-ring-button fixed bottom-8 left-1/2 h-[44px] -translate-x-1/2 transform rounded-full border border-gray-200 bg-white px-4 py-2 font-medium text-black transition-colors hover:bg-[#F9F9F8]"
        style={{ fontFamily: "Open Runde" }}
      >
        Shaders
      </button>

      <Drawer.Root open={isOpen} onOpenChange={setIsOpen}>
        <Drawer.Portal>
          <Drawer.Overlay
            className="fixed inset-0 z-10 bg-black/30"
            onClick={() => setIsOpen(false)}
          />
          <Drawer.Content
            asChild
            className="fixed inset-x-4 bottom-4 z-20 mx-auto max-w-[361px] overflow-hidden rounded-[36px] bg-[#FEFFFE] outline-none"
          >
            <motion.div animate={{ height: bounds.height }}>
              <Drawer.Close asChild>
                <button
                  data-vaul-no-drag
                  className="focus-visible:shadow-focus-ring-button absolute right-8 top-7 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-[#F7F8F9] text-[#949595] transition-transform focus:scale-95 active:scale-75"
                >
                  <CloseIcon />
                </button>
              </Drawer.Close>

              <div
                ref={ref}
                className="space-y-3 px-6 pb-8 pt-2"
                style={{ fontFamily: "Open Runde" }}
              >
                <Drawer.Title className="px-6 pt-6 text-[19px] font-semibold text-[#222222] md:font-medium">
                  {dialogTitle}
                </Drawer.Title>
                {walletOptions.map((opt) => (
                  <OptionLink
                    key={opt.label}
                    {...opt}
                    onNavigate={() => setIsOpen(false)}
                  />
                ))}
              </div>
            </motion.div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
}
