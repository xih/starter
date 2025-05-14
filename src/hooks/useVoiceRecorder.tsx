"use client";

import React, {
  useState,
  useEffect,
  useRef,
  createContext,
  useContext,
} from "react";
import { useMicVAD, utils } from "@ricky0123/vad-react";
import {
  set as idbSet,
  get as idbGet,
  del as idbDel,
  keys as idbKeys,
} from "idb-keyval";

// A single recording entry
export type Recording = { id: string; blob: Blob; createdAt: number };

// Context value shape
interface VoiceRecorderContextValue {
  isRecording: boolean;
  toggleRecording: () => void;
  playRecording: (id: string) => Promise<void>;
  listRecordings: () => Promise<Recording[]>;
  deleteRecording: (id: string) => Promise<void>;
}

// Create the context
const VoiceRecorderContext = createContext<VoiceRecorderContextValue | null>(
  null,
);

// Provider component
export function VoiceRecorderProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const mediaRef = useRef<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  // Hook up VAD to stop on silence and save the WAV
  const vad = useMicVAD({
    startOnLoad: false,
    onSpeechEnd: async (audioBuffer) => {
      console.log("[VoiceRecorder] VAD detected end of speech");
      const wav = utils.encodeWAV(audioBuffer);
      const blob = new Blob([wav], { type: "audio/wav" });
      const id = `rec-${Date.now()}`;
      await idbSet(id, { id, blob, createdAt: Date.now() });
      console.log("[VoiceRecorder] Saved recording to IndexedDB:", id);
      setIsRecording(false);
    },
    positiveSpeechThreshold: 0.6,
    minSpeechFrames: 4,
  });

  // Side effect: start or stop stream whenever `isRecording` changes
  useEffect(() => {
    console.log("[VoiceRecorder] isRecording changed →", isRecording);
    if (isRecording) {
      console.log("[VoiceRecorder] Acquiring microphone...");
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          console.log("[VoiceRecorder] Microphone stream obtained", stream);
          mediaRef.current = stream;
          vad.start();
          console.log("[VoiceRecorder] VAD started");
        })
        .catch((err) => {
          console.error("[VoiceRecorder] getUserMedia failed:", err);
          setIsRecording(false);
        });
    } else {
      console.log("[VoiceRecorder] Stopping microphone...");
      mediaRef.current?.getTracks().forEach((track) => {
        console.log("[VoiceRecorder] Stopping track", track);
        track.stop();
      });
      mediaRef.current = null;
      vad.pause();
      console.log("[VoiceRecorder] VAD paused");
    }
  }, [isRecording, vad]);

  // Flip the recording state
  const toggleRecording = () => {
    console.log("[VoiceRecorder] toggleRecording →", !isRecording);
    setIsRecording((prev) => !prev);
  };

  // List all saved recordings
  const listRecordings = async (): Promise<Recording[]> => {
    const keys = await idbKeys();
    const recs: Recording[] = [];
    for (const key of keys) {
      const rec = await idbGet<Recording>(key as string);
      if (rec) recs.push(rec);
    }
    recs.sort((a, b) => b.createdAt - a.createdAt);
    return recs;
  };

  // Delete a specific recording
  const deleteRecording = async (id: string) => {
    await idbDel(id);
    console.log("[VoiceRecorder] Deleted recording:", id);
  };

  // Play back a specific recording
  const playRecording = async (id: string) => {
    const rec = await idbGet<Recording>(id);
    if (!rec) {
      console.warn("[VoiceRecorder] No recording found for id", id);
      return;
    }
    const url = URL.createObjectURL(rec.blob);
    const audio = new Audio(url);
    await audio.play();
    console.log("[VoiceRecorder] Playing recording:", id);
  };

  // Provide the context value
  return (
    <VoiceRecorderContext.Provider
      value={{
        isRecording,
        toggleRecording,
        playRecording,
        listRecordings,
        deleteRecording,
      }}
    >
      {children}
    </VoiceRecorderContext.Provider>
  );
}

// Hook to consume the context
export function useVoiceRecorder(): VoiceRecorderContextValue {
  const ctx = useContext(VoiceRecorderContext);
  if (!ctx)
    throw new Error(
      "useVoiceRecorder must be used within VoiceRecorderProvider",
    );
  return ctx;
}
