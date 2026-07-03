// components/DVDShaderClient.tsx
"use client";

import dynamic from "next/dynamic";

// dynamically import the real DVDShader, but only on the client
const DVDShader = dynamic(() => import("./index"), {
  ssr: false,
});

export default DVDShader;
