"use client";

import { Check, Copy, X } from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetTitle } from "~/components/ui/sheet";

interface TransactionDetailsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransactionDetails({
  open,
  onOpenChange,
}: TransactionDetailsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText("3W4g...z5xH");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy text: ", error);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="center"
        className="max-w-md rounded-lg bg-transparent p-0 shadow-none"
        hideCloseButton
      >
        {/* Add SheetTitle for accessibility, but visually hide it */}
        <SheetTitle className="sr-only">USDC Withdrawal Details</SheetTitle>

        {/* iPhone SVG Mockup */}
        <div className="relative mx-auto w-full max-w-[380px]">
          <svg
            viewBox="0 0 390 844"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="h-auto w-full"
          >
            {/* iPhone Frame */}
            <rect
              x="0.5"
              y="0.5"
              width="389"
              height="843"
              rx="55.5"
              fill="white"
              stroke="black"
            />
            <rect
              x="12"
              y="12"
              width="366"
              height="820"
              rx="44"
              fill="white"
              stroke="black"
              strokeWidth="2"
            />

            {/* Notch */}
            <path
              d="M162 12H228C228 18.6274 222.627 24 216 24H174C167.373 24 162 18.6274 162 12Z"
              fill="black"
            />

            {/* Home Indicator */}
            <rect
              x="145"
              y="810"
              width="100"
              height="5"
              rx="2.5"
              fill="black"
            />
          </svg>

          {/* Transaction Details Card - Positioned inside the iPhone */}
          <div className="absolute inset-0 flex items-center justify-center px-6 py-12">
            <div className="w-full max-w-[320px] overflow-hidden rounded-3xl bg-gray-50 shadow-xl">
              <div className="relative w-full px-4 pb-6 pt-6">
                {/* Close button */}
                <button
                  onClick={() => onOpenChange(false)}
                  className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>

                {/* Transaction details */}
                <div className="flex flex-col items-center">
                  {/* USDC Icon */}
                  <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-blue-500">
                    <div className="relative">
                      <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs">
                        <span className="text-blue-500">$</span>
                      </span>
                      <span className="text-2xl font-bold text-white">$</span>
                    </div>
                  </div>

                  {/* Title */}
                  <h2 className="mb-1 text-center text-lg font-normal text-gray-500">
                    USDC Withdrawal
                  </h2>

                  {/* Amount */}
                  <h1 className="mb-1 text-center text-4xl font-bold">
                    1,508.50 USDC
                  </h1>

                  {/* Date */}
                  <p className="mb-6 text-center text-gray-500">
                    11 March 2025 at 10:07
                  </p>

                  {/* Status */}
                  <div className="mb-4 w-full border-b border-gray-200 pb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Status</span>
                      <div className="flex items-center">
                        <span className="mr-1 font-medium text-green-500">
                          Completed
                        </span>
                        <Check className="h-5 w-5 text-green-500" />
                      </div>
                    </div>
                  </div>

                  {/* To */}
                  <div className="mb-4 w-full border-b border-gray-200 pb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">To</span>
                      <span className="font-medium">Revolut ••••1342</span>
                    </div>
                  </div>

                  {/* Account owner name */}
                  <div className="mb-4 w-full border-b border-gray-200 pb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Account owner name</span>
                      <span className="font-medium">Thomas A. Anderson</span>
                    </div>
                  </div>

                  {/* Transfer fee */}
                  <div className="mb-4 w-full border-b border-gray-200 pb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Transfer fee</span>
                      <span className="font-medium">$8.50</span>
                    </div>
                  </div>

                  {/* Payment rail */}
                  <div className="mb-4 w-full border-b border-gray-200 pb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Payment rail</span>
                      <span className="font-medium">ACH Same Day</span>
                    </div>
                  </div>

                  {/* Onchain transaction */}
                  <div className="mb-4 w-full border-b border-gray-200 pb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Onchain transaction</span>
                      <div className="flex items-center">
                        <span className="mr-1 font-medium">3W4g...z5xH</span>
                        <button onClick={handleCopy} className="text-gray-400">
                          {copied ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Network fee */}
                  <div className="mb-6 w-full pb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Network fee</span>
                      <div className="flex items-center">
                        <span className="mr-1 font-medium text-green-500">
                          Free
                        </span>
                        <svg
                          className="h-4 w-4 text-green-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 10V3L4 14h7v7l9-11h-7z"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Hide details button */}
                  <button
                    onClick={() => onOpenChange(false)}
                    className="w-full rounded-md py-3 text-center font-medium text-gray-700 hover:bg-gray-100"
                  >
                    Hide details
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
