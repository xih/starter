"use client";

import { useCallback } from "react";

export const PERSONA_TTS_SWITCH_RPC_METHOD = "persona.switch_tts";
export const DEFAULT_PERSONA_SWITCH_RPC_TIMEOUT = 8_000;

export type PersonaSwitchFlags = {
  memory?: boolean;
  prompt?: boolean;
  tools?: boolean;
  voice?: boolean;
};

export type PersonaSwitchRequest = PersonaSwitchFlags & {
  personaId: string;
};

export type PersonaSwitchRpcPayload = Required<PersonaSwitchFlags> & {
  persona_id: string;
  session_id?: string;
  user_id?: string;
};

export type PersonaSwitchRpcCall = {
  destinationIdentity: string;
  method: typeof PERSONA_TTS_SWITCH_RPC_METHOD;
  payload: string;
  responseTimeout: number;
};

export type PersonaSwitchRpcParticipant = {
  performRpc: (call: PersonaSwitchRpcCall) => Promise<string>;
};

export function createPersonaSwitchRpcPayload({
  memory = false,
  personaId,
  prompt = false,
  roomName,
  tools = false,
  userId,
  voice = true,
}: PersonaSwitchRequest & {
  roomName?: string;
  userId?: string;
}): PersonaSwitchRpcPayload {
  return {
    memory,
    persona_id: personaId,
    prompt,
    session_id: roomName,
    tools,
    user_id: userId,
    voice,
  };
}

export function createPersonaSwitchRpcCall({
  agentIdentity,
  request,
  responseTimeout = DEFAULT_PERSONA_SWITCH_RPC_TIMEOUT,
  roomName,
  userId,
}: {
  agentIdentity: string;
  request: PersonaSwitchRequest;
  responseTimeout?: number;
  roomName?: string;
  userId?: string;
}): PersonaSwitchRpcCall {
  return {
    destinationIdentity: agentIdentity,
    method: PERSONA_TTS_SWITCH_RPC_METHOD,
    payload: JSON.stringify(
      createPersonaSwitchRpcPayload({
        ...request,
        roomName,
        userId,
      }),
    ),
    responseTimeout,
  };
}

export function usePersonaSwitchRpc({
  agentIdentity,
  localParticipant,
  responseTimeout,
  roomName,
  userId,
}: {
  agentIdentity?: string;
  localParticipant: PersonaSwitchRpcParticipant;
  responseTimeout?: number;
  roomName?: string;
  userId?: string;
}) {
  return useCallback(
    (request: PersonaSwitchRequest) => {
      if (!agentIdentity) {
        throw new Error("The agent is not ready for persona switching yet.");
      }

      // Follow-up addendum: keep this caller shape compatible with a future
      // switchPersona({ personaId, voice: true, prompt: true, memory: true, tools: true })
      // flow. The current LiveKit RPC swaps the TTS layer; the extra flags let
      // the same hook graduate to full persona context switching later.
      return localParticipant.performRpc(
        createPersonaSwitchRpcCall({
          agentIdentity,
          request,
          responseTimeout,
          roomName,
          userId,
        }),
      );
    },
    [agentIdentity, localParticipant, responseTimeout, roomName, userId],
  );
}
