"use client";

import type React from "react";

import { useState, useRef, useEffect } from "react";
import { PromptInput } from "~/components/ui/prompt-input";
import { Mic, Send } from "lucide-react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

export function VoiceChatInput() {
  const [inputValue, setInputValue] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [showGlow, setShowGlow] = useState(false);
  const [audioData, setAudioData] = useState<number[]>(Array(100).fill(0));

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLDivElement>(null);

  // Initialize audio context
  useEffect(() => {
    audioContextRef.current = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
    analyserRef.current = audioContextRef.current.createAnalyser();
    analyserRef.current.fftSize = 256;

    return () => {
      if (
        audioContextRef.current &&
        audioContextRef.current.state !== "closed"
      ) {
        audioContextRef.current.close();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Handle microphone toggle
  const toggleMicrophone = async () => {
    if (isListening) {
      stopListening();
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        mediaStreamRef.current = stream;

        const audioContext = audioContextRef.current!;
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyserRef.current!);

        setIsListening(true);
        startVisualization();
      } catch (error) {
        console.error("Error accessing microphone:", error);
      }
    }
  };

  // Stop listening
  const stopListening = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    setIsListening(false);
    setAudioData(Array(100).fill(0));
  };

  // Start audio visualization
  const startVisualization = () => {
    const analyser = analyserRef.current!;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const updateVisualization = () => {
      analyser.getByteFrequencyData(dataArray);

      // Resample to get exactly 100 data points
      const visualData = Array(100)
        .fill(0)
        .map((_, i) => {
          const index = Math.floor((i * dataArray.length) / 100);
          return dataArray[index] || 0;
        });

      setAudioData(visualData);
      animationFrameRef.current = requestAnimationFrame(updateVisualization);
    };

    updateVisualization();
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      console.log("Submitted:", inputValue);
      setInputValue("");
    }
  };

  // Generate gradient for input border
  useEffect(() => {
    if (!showGlow || !inputRef.current) return;

    let hue = 0;
    const animateGradient = () => {
      if (!inputRef.current || !showGlow) return;

      hue = (hue + 1) % 360;
      const gradient = `linear-gradient(90deg, 
        hsl(${hue}, 100%, 50%), 
        hsl(${(hue + 60) % 360}, 100%, 50%), 
        hsl(${(hue + 120) % 360}, 100%, 50%), 
        hsl(${(hue + 180) % 360}, 100%, 50%), 
        hsl(${(hue + 240) % 360}, 100%, 50%), 
        hsl(${(hue + 300) % 360}, 100%, 50%))`;

      inputRef.current.style.borderImage = gradient;
      inputRef.current.style.borderImageSlice = "1";

      requestAnimationFrame(animateGradient);
    };

    const animation = requestAnimationFrame(animateGradient);

    return () => {
      cancelAnimationFrame(animation);
      if (inputRef.current) {
        inputRef.current.style.borderImage = "";
      }
    };
  }, [showGlow]);

  return (
    <div className="relative mx-auto w-full max-w-3xl">
      <form onSubmit={handleSubmit} className="relative">
        <div
          ref={inputRef}
          className={cn(
            "relative overflow-hidden rounded-xl transition-all duration-300",
            showGlow ? "border-2" : "border border-input",
          )}
        >
          <PromptInput
            value={inputValue}
            onValueChange={setInputValue}
            className="border-none pr-24"
          >
            <div className="flex items-center gap-2">
              hi
            </div>
          </PromptInput>

          {/* Audio visualization */}
          <div
            className={cn(
              "absolute bottom-0 left-0 right-0 h-8 overflow-hidden transition-opacity duration-300",
              isListening ? "opacity-100" : "opacity-0",
            )}
          >
            <div className="flex h-full w-full items-center justify-between px-4">
              {audioData.map((value, index) => (
                <div
                  key={index}
                  className="rounded-full transition-all duration-75"
                  style={{
                    width: "3px",
                    height: `${Math.max(3, value / 10)}px`,
                    backgroundColor: `hsl(${(index * 3) % 360}, 80%, 60%)`,
                    transform: `translateY(${-Math.max(0, value / 20)}px)`,
                  }}
                />
              ))}
            </div>
          </div>

          <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-2">
            <Button
              type="submit"
              size="icon"
              variant="ghost"
              disabled={!inputValue.trim()}
            >
              <Send className="h-5 w-5" />
              <span className="sr-only">Send message</span>
            </Button>
          </div>
        </div>
      </form>

      {/* Control buttons */}
      <div className="absolute -bottom-16 left-1/2 flex -translate-x-1/2 items-center gap-4">
        {/* Glow toggle button */}
        <button
          type="button"
          onClick={() => setShowGlow(!showGlow)}
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full transition-all",
            showGlow
              ? "bg-purple-500 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200",
          )}
        >
          <div className="h-4 w-4 rounded-full bg-current" />
          <span className="sr-only">Toggle glow effect</span>
        </button>

        {/* Microphone button */}
        <button
          type="button"
          onClick={toggleMicrophone}
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-full transition-all",
            isListening
              ? "bg-red-500 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200",
          )}
        >
          <Mic className="h-6 w-6" />
          <span className="sr-only">
            {isListening ? "Stop recording" : "Start recording"}
          </span>
        </button>
      </div>
    </div>
  );
}
