"use client";

import { useState, useRef, useEffect } from "react";
import { Mic } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card } from "~/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";

// Allow WebKit prefix for older browsers
declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

export default function AudioWaveComponent() {
  // Core visualization parameters
  const BAR_COUNT = 120; // Increased from 40 to fill the width
  const BAR_WIDTH = 2; // Slightly reduced to fit more bars
  const SAMPLE_RATE = 100; // Milliseconds between audio samples
  const BARS_PER_SECOND = 2; // Color transition speed

  // Audio processing parameters
  const FREQUENCY_LOW = 0.1; // Lower frequency cutoff (0-1 range)
  const FREQUENCY_HIGH = 0.7; // Upper frequency cutoff (0-1 range)
  const SENSITIVITY = 1.5; // Amplification factor for audio input
  const MIN_HEIGHT = 0.05; // Minimum bar height (prevents empty bars)
  const MAX_HEIGHT_PERCENT = 80; // Maximum height as percentage of container

  // Animation parameters
  const ANIMATION_DURATION = 0.5; // Duration of initial animation
  const SPRING_STIFFNESS = 120; // Spring stiffness for animations
  const SPRING_DAMPING = 10; // Spring damping for animations

  // Debug mode
  const DEBUG_MODE = true; // Set to true to show debug information

  const [isListening, setIsListening] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [audioHistory, setAudioHistory] = useState<number[]>(
    Array(BAR_COUNT).fill(0),
  );
  const [recordingStartTime, setRecordingStartTime] = useState<number>(0);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [isInitialRender, setIsInitialRender] = useState(true);
  const [animationKey, setAnimationKey] = useState(0);

  // Debug state
  const [debugInfo, setDebugInfo] = useState<{
    lastSample: number;
    sampleCount: number;
    historySnapshots: number[][];
    currentDecibelValue: number;
    decibelHistory: number[];
    weightedAverage5Sec: number;
  }>({
    lastSample: 0,
    sampleCount: 0,
    historySnapshots: [],
    currentDecibelValue: 0,
    decibelHistory: [],
    weightedAverage5Sec: 0,
  });

  // Refs for audio processing
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const micButtonRef = useRef<HTMLButtonElement>(null);
  const sampleIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioHistoryRef = useRef<number[]>(
    new Array<number>(BAR_COUNT).fill(0),
  );
  const decibelHistoryRef = useRef<number[]>([]);

  // Initialize audio context and analyzer
  const initAudio = async () => {
    try {
      // Pick standard or prefixed AudioContext constructor
      const Ctor = window.AudioContext || window.webkitAudioContext!;
      audioContextRef.current ??= new Ctor();

      // Get user media (microphone)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Create analyzer node
      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      // Create buffer for frequency data
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      dataArrayRef.current = dataArray;

      // Connect microphone to analyzer
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyser);
      sourceRef.current = source;

      // Reset audio history
      const initialHistory = new Array<number>(BAR_COUNT).fill(0);
      audioHistoryRef.current = initialHistory;
      setAudioHistory(initialHistory);
      setIsInitialRender(true);
      setRecordingStartTime(Date.now());
      setElapsedTime(0);
      setAnimationKey((prev) => prev + 1);

      // Reset debug info
      decibelHistoryRef.current = [];
      setDebugInfo({
        lastSample: 0,
        sampleCount: 0,
        historySnapshots: [],
        currentDecibelValue: 0,
        decibelHistory: [],
        weightedAverage5Sec: 0,
      });

      // Start sampling at fixed intervals
      startSampling();
    } catch (err) {
      console.error("Error accessing microphone:", err);
    }
  };

  // Clean up audio resources
  const cleanupAudio = () => {
    if (sampleIntervalRef.current) {
      clearInterval(sampleIntervalRef.current);
      sampleIntervalRef.current = null;
    }

    if (sourceRef.current) {
      sourceRef.current.disconnect();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      void audioContextRef.current.close();
    }

    audioContextRef.current = null;
    analyserRef.current = null;
    dataArrayRef.current = null;
    sourceRef.current = null;
    streamRef.current = null;

    // Reset audio data
    const resetHistory = new Array<number>(BAR_COUNT).fill(0);
    audioHistoryRef.current = resetHistory;
    setAudioHistory(resetHistory);
    decibelHistoryRef.current = [];
  };

  // Toggle listening state
  const toggleListening = async () => {
    if (isListening) {
      setIsListening(false);
      cleanupAudio();
    } else {
      setIsListening(true);
      await initAudio();
    }
  };

  // Start sampling audio at fixed intervals
  const startSampling = () => {
    // Clear any existing interval
    if (sampleIntervalRef.current) {
      clearInterval(sampleIntervalRef.current);
    }

    // Set up new sampling interval
    sampleIntervalRef.current = setInterval(() => {
      captureAudioSample();
      updateElapsedTime();
    }, SAMPLE_RATE);
  };

  // Convert normalized amplitude to decibels (rough approximation)
  const amplitudeToDecibels = (amplitude: number): number => {
    // Avoid log(0)
    if (amplitude <= 0) return -100;

    // Convert normalized amplitude to decibels
    // Using 20 * log10(amplitude) with a reference level
    // This is a simplified approximation
    return 20 * Math.log10(amplitude) + 60; // +60 to shift to a more readable range
  };

  // Calculate weighted average over the last 5 seconds
  const calculateWeightedAverage = (history: number[]): number => {
    if (history.length === 0) return 0;

    // For a 5-second window at 100ms sample rate, we need 50 samples
    const samplesNeeded = 5000 / SAMPLE_RATE;
    const samples = history.slice(-samplesNeeded);

    if (samples.length === 0) return 0;

    // Apply linear weighting - newer samples have higher weight
    let weightedSum = 0;
    let weightSum = 0;

    samples.forEach((value, index) => {
      const weight = index + 1; // Linear weight: newer samples have higher weight
      weightedSum += value * weight;
      weightSum += weight;
    });

    return weightedSum / weightSum;
  };

  // Capture a single audio sample
  const captureAudioSample = () => {
    if (!analyserRef.current || !dataArrayRef.current) return;

    const analyser = analyserRef.current;
    const dataArray = dataArrayRef.current;

    // Get frequency data
    analyser.getByteFrequencyData(dataArray);

    // Calculate a single amplitude value from the frequency data
    const startFreq = Math.floor(dataArray.length * FREQUENCY_LOW);
    const endFreq = Math.floor(dataArray.length * FREQUENCY_HIGH);

    let sum = 0;
    for (let i = startFreq; i < endFreq; i++) {
      sum += dataArray[i] ?? 0;
    }

    // Normalize to 0-1 range with sensitivity adjustment
    const currentAmplitude = Math.min(
      1,
      (sum / ((endFreq - startFreq) * 255)) * SENSITIVITY,
    );

    // Convert to decibels for logging
    const currentDecibels = amplitudeToDecibels(currentAmplitude);

    // Update decibel history
    const updatedDecibelHistory = [
      ...decibelHistoryRef.current,
      currentDecibels,
    ];
    decibelHistoryRef.current = updatedDecibelHistory;

    // Calculate weighted average
    const weightedAverage = calculateWeightedAverage(updatedDecibelHistory);

    // Update audio history by shifting left and adding new value at the end
    const currentHistory = [...audioHistoryRef.current];
    const newHistory = [...currentHistory.slice(1), currentAmplitude];

    // Update our ref
    audioHistoryRef.current = newHistory;

    // Update the state to trigger a re-render
    setAudioHistory(newHistory);

    // Update debug info
    if (DEBUG_MODE) {
      setDebugInfo((prev) => {
        // Keep last 5 snapshots for debugging
        const snapshots = [...prev.historySnapshots, [...newHistory]];
        if (snapshots.length > 5) {
          snapshots.shift();
        }

        return {
          lastSample: currentAmplitude,
          sampleCount: prev.sampleCount + 1,
          historySnapshots: snapshots,
          currentDecibelValue: currentDecibels,
          decibelHistory: updatedDecibelHistory.slice(-100), // Keep last 100 samples for UI
          weightedAverage5Sec: weightedAverage,
        };
      });
    }
  };

  // Update elapsed time
  const updateElapsedTime = () => {
    setElapsedTime((Date.now() - recordingStartTime) / 1000);
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      cleanupAudio();
    };
  }, []);

  // Get mic button position for animation origin
  const getMicButtonPosition = () => {
    if (!micButtonRef.current) return { x: 0, y: 0 };

    const rect = micButtonRef.current.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  };

  // Calculate bar color based on position and elapsed time
  const getBarColor = (index: number) => {
    const colorTransitionIndex = Math.min(
      BAR_COUNT,
      Math.floor(elapsedTime * BARS_PER_SECOND),
    );

    // Bars from the left should change color first
    // index 0 is leftmost, BAR_COUNT-1 is rightmost
    return index < colorTransitionIndex ? "#8D8D8D" : "#E7E7E7";
  };

  // Render the bars with fixed heights
  const renderBars = () => {
    return audioHistory.map((value, index) => {
      const micPos = getMicButtonPosition();
      const barColor = getBarColor(index);
      const barHeight = `${Math.max(MIN_HEIGHT, value) * MAX_HEIGHT_PERCENT}%`;

      return (
        <motion.div
          key={`bar-${index}`} // Removed animationKey to prevent re-rendering
          className="mx-px rounded-sm"
          style={{
            backgroundColor: barColor,
            height: barHeight,
            width: `${BAR_WIDTH}px`,
          }}
          initial={
            isInitialRender
              ? {
                  height: 0,
                  width: `${BAR_WIDTH}px`,
                  x: micPos.x - window.innerWidth / 2,
                  y: micPos.y - window.innerHeight / 2,
                  opacity: 0,
                }
              : {
                  height: barHeight,
                  width: `${BAR_WIDTH}px`,
                  opacity: 1,
                }
          }
          animate={{
            height: barHeight,
            width: `${BAR_WIDTH}px`,
            x: 0,
            y: 0,
            opacity: 1,
          }}
          transition={{
            duration: ANIMATION_DURATION,
            delay: isInitialRender ? index * 0.01 : 0,
            type: "spring",
            stiffness: SPRING_STIFFNESS,
            damping: SPRING_DAMPING,
          }}
        />
      );
    });
  };

  // Render debug information
  const renderDebugInfo = () => {
    if (!DEBUG_MODE) return null;

    return (
      <div className="mt-4 overflow-auto rounded-md bg-gray-100 p-4 font-mono text-xs">
        <h3 className="mb-2 font-bold">Debug Information</h3>
        <div className="mb-2">
          <div>Elapsed Time: {elapsedTime.toFixed(2)}s</div>
          <div>Sample Count: {debugInfo.sampleCount}</div>
          <div>Last Sample Value: {debugInfo.lastSample.toFixed(3)}</div>
        </div>

        <div className="mb-2">
          <div className="font-bold">Decibel Values:</div>
          <div>Current: {debugInfo.currentDecibelValue.toFixed(2)} dB</div>
          <div>
            5-Second Weighted Average:{" "}
            {debugInfo.weightedAverage5Sec.toFixed(2)} dB
          </div>
        </div>

        <div className="mb-2">
          <div className="font-bold">Current Audio History:</div>
          <div className="flex flex-wrap">
            {audioHistory.slice(-20).map((value, i) => (
              <div
                key={i}
                className="mb-1 mr-1 rounded bg-gray-200 px-1"
                title={`Bar ${i}: ${value.toFixed(3)}`}
              >
                {value.toFixed(2)}
              </div>
            ))}
            <span className="text-gray-500">
              ... (showing last 20 of {BAR_COUNT} values)
            </span>
          </div>
        </div>

        <div>
          <div className="font-bold">History Snapshots (newest first):</div>
          {debugInfo.historySnapshots
            .slice()
            .reverse()
            .map((snapshot, i) => (
              <div key={i} className="mb-1">
                <div className="text-gray-500">
                  Snapshot {debugInfo.sampleCount - i}:
                </div>
                <div className="flex overflow-x-auto pb-1">
                  {snapshot.slice(-20).map((value, j) => (
                    <div
                      key={j}
                      className="mr-1 rounded bg-gray-200 px-1"
                      style={{
                        opacity: j === snapshot.length - 1 ? 1 : 0.7, // Highlight newest value
                        backgroundColor:
                          j === snapshot.length - 1 ? "#ffcccc" : "#e5e5e5",
                      }}
                    >
                      {value.toFixed(2)}
                    </div>
                  ))}
                  <span className="text-gray-500">
                    ... (showing last 20 values)
                  </span>
                </div>
              </div>
            ))}
        </div>
      </div>
    );
  };

  // Render decibel history graph
  const renderDecibelGraph = () => {
    if (!DEBUG_MODE) return null;

    const history = debugInfo.decibelHistory;
    if (history.length === 0) return null;

    // Find min and max for scaling
    const minDb = Math.min(...history, -60);
    const maxDb = Math.max(...history, 0);
    const range = maxDb - minDb;

    return (
      <div className="mt-4 rounded-md bg-gray-50 p-2">
        <div className="mb-1 text-xs font-bold">Decibel History:</div>
        <div className="flex h-20 items-end border-b border-gray-300">
          {history.map((db, i) => {
            // Normalize to 0-1 range
            const normalizedHeight = (db - minDb) / (range || 1);

            return (
              <div
                key={i}
                className="mx-px w-1"
                style={{
                  height: `${Math.max(0.05, normalizedHeight) * 100}%`,
                  backgroundColor: i === history.length - 1 ? "red" : "blue",
                  opacity: 0.7,
                }}
                title={`${db.toFixed(1)} dB`}
              />
            );
          })}
        </div>
        <div className="mt-1 flex justify-between text-xs text-gray-500">
          <div>{minDb.toFixed(0)} dB</div>
          <div>{maxDb.toFixed(0)} dB</div>
        </div>
      </div>
    );
  };

  return (
    <Card className="mx-auto w-full max-w-3xl p-4">
      <div className="relative flex w-full items-center">
        <Input
          type="text"
          placeholder="Ask anything"
          className="pr-12"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
        />
        <div className="absolute right-2 flex items-center gap-2">
          <Button
            ref={micButtonRef}
            variant="ghost"
            size="icon"
            className={`rounded-full ${isListening ? "bg-red-100" : ""}`}
            onClick={toggleListening}
          >
            <Mic className={isListening ? "text-red-500" : "text-gray-500"} />
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {isListening && (
          <motion.div
            key={`container-${animationKey}`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "3rem" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-4 w-full overflow-hidden"
          >
            <div className="flex h-12 w-full items-center justify-center rounded-md bg-gray-50 px-4">
              <div className="flex h-full w-full items-center justify-between">
                {renderBars()}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Debug information */}
      {isListening && renderDebugInfo()}

      {/* Decibel graph */}
      {isListening && renderDecibelGraph()}

      {/* Visual debug of bar heights - now full width */}
      {isListening && DEBUG_MODE && (
        <div className="mt-2 overflow-hidden rounded-md bg-gray-50 p-2">
          <div className="mb-1 text-xs font-bold">
            Bar Heights Visualization:
          </div>
          <div className="flex h-20 w-full items-end border-b border-gray-300">
            {audioHistory.map((value, i) => (
              <div
                key={i}
                className="mx-0"
                style={{
                  height: `${value * 100}%`,
                  backgroundColor:
                    i === audioHistory.length - 1 ? "red" : "black",
                  opacity: 0.7,
                  width: `${100 / BAR_COUNT}%`, // Make bars fill the full width
                  minWidth: "1px", // Ensure bars are at least 1px wide
                }}
                title={`Bar ${i}: ${value.toFixed(3)}`}
              />
            ))}
          </div>
          <div className="mt-1 flex justify-between text-xs text-gray-500">
            <div>← Oldest</div>
            <div>Newest →</div>
          </div>
        </div>
      )}
    </Card>
  );
}
