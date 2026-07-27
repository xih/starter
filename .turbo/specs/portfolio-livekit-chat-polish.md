# Portfolio LiveKit Chat Polish

## Overview

The portfolio chat experience currently lets a visitor click into the voice/chat surface, but the user-facing result can stall with "The agent did not respond. Try again in a moment." The investigation shows the web route and LiveKit Cloud dispatch contract are mostly intact, while the failure is most likely caused by the hosted agent not producing a participant/transcript before the client's reply timeout.

This spec covers three fixes: improve the LiveKit startup/dispatch path so the agent reliably joins and speaks, restore the bottom divider shown in the referenced Figma frame, and replace the hand-rolled hero gradient with a polished Paper Design shader that keeps the portfolio hero beautiful and performant.

## Users

- Portfolio visitors who expect the first chat action to connect them to the agent quickly and receive a spoken/text reply.
- The site owner and engineers who need actionable diagnostics when LiveKit fails because of billing, deployment, dispatch, or environment configuration.

## Investigation Findings

- The referenced Figma frame `Portfolio / 364:13424` shows the full hero/chat band with a bottom border (`border-b`) and the sidebar with a left divider.
- The current desktop launcher and `/ask` desktop session pass `desktopSidebarClassName="h-[928px] border-0"` or `AgentSideBar className="h-[928px] border-0"`, which suppresses the component's built-in sidebar divider.
- `TestingSession` auto-starts after the portfolio launcher swaps into the live session, so the Start Chat click is not inert. It transitions to a mounted LiveKit session and then `useLiveKitSessionController.startSession()` performs guest-session preflight and `session.start()`.
- The "agent did not respond" copy comes from `PENDING_REPLY_TIMEOUT_MS = 20_000` in `apps/web/src/app/testing/use-livekit-session-controller.ts` after a user message has no later agent message.
- Production CORS and guest-session health checks are passing:
  - `OPTIONS https://www.dennisxing.fm/api/livekit/guest-session` with origin `https://www.dennisxing.fm` returned `204`.
  - `GET https://www.dennisxing.fm/api/livekit/guest-session` with origin `https://www.dennisxing.fm` returned `200 {"ok":true}`.
- LiveKit Cloud CLI confirms the deployed Cloud Agent exists with dispatch name `dennis-portfolio-agent`, version `VKTSbdnZzh7f`, status `Sleeping`, and deployment date `2026-07-16T00:23:27Z`.
- A LiveKit CLI smoke dispatch to `dennis-portfolio-agent` was accepted, but after a 10-second wait no participant was listed. Deploy logs showed the sleeping worker only registered around 13 seconds after dispatch, so the evidence points to cold-start/agent readiness latency as a likely contributor. A longer smoke test could not complete because Infisical secret fetch failed with a network reset.
- No LiveKit MCP tools were exposed in this session after tool discovery. Billing status could not be directly confirmed from the requested MCP. No CLI output observed here specifically confirmed a billing failure.
- Targeted tests pass after installing dependencies offline: guest-session route tests, testing-session message tests, and AgentSideBar tests.
- `@paper-design/shaders-react` is already installed. Available shader exports include `MeshGradient`, `GrainGradient`, `PaperTexture`, `StaticMeshGradient`, `Waves`, and related presets.

## Requirements

### LiveKit Startup And Agent Response

- **R1.** When a desktop visitor clicks the portfolio chat CTA, the system shall visibly enter the connecting/chat state and attempt exactly one LiveKit guest session startup for the new room.
- **R2.** When the guest LiveKit session connects, the system shall ensure the configured `dennis-portfolio-agent` dispatch is present for the active room.
- **R3.** When explicit guest dispatch fails, the system shall surface an actionable error that includes whether the failure came from guest-session preflight, LiveKit session start, dispatch ensure, or no agent reply.
- **R4.** When the agent is cold-starting, the system shall avoid showing "The agent did not respond" before the agent has had a reasonable readiness window to join and answer.
- **R5.** When a user sends the first typed message before the agent is listening, the system shall queue the message and send it once LiveKit reports the agent is ready, or fail with a clear startup/dispatch error.
- **R6.** The system shall keep the canonical dispatch name aligned between web and worker as `dennis-portfolio-agent`.
- **R7.** The implementation shall include a repeatable LiveKit smoke check that distinguishes room creation, dispatch creation, agent participant join, and first transcript response.
- **R8.** If billing remains suspected, the verification checklist shall require checking LiveKit Cloud billing/hosted inference status in the dashboard or a LiveKit MCP/tool that exposes account billing.

### Visual Divider

- **R9.** When the desktop portfolio hero/chat band renders, the system shall show a bottom divider across the full hero plus chat section matching the Figma frame.
- **R10.** When the desktop chat sidebar renders beside the hero, the system shall show the left divider between hero and chat unless the layout itself intentionally provides an equivalent divider.
- **R11.** The divider styling shall use existing design tokens, especially `--color-border-opaque`, instead of hard-coded one-off colors.

### Paper Shader Hero

- **R12.** The portfolio hero shall use `@paper-design/shaders-react` for the background shader instead of the custom canvas gradient.
- **R13.** The shader shall preserve the Figma intent: luminous blue/cyan lower field, soft violet/pink upper band, dark oceanic middle depth, and readable white hero copy.
- **R14.** The shader shall render full-bleed inside `HeroSurface`, remain non-interactive/pointer-safe behind content, and avoid layout shifts on desktop and mobile.
- **R15.** The shader shall degrade gracefully if WebGL/shader rendering is unavailable by retaining a solid or CSS-gradient fallback background.
- **R16.** The final visual implementation shall be smoke-tested on desktop and mobile viewports for nonblank rendering, text readability, and no overlap.

## Design

### Architecture

The implementation stays inside the existing Next.js/React portfolio and LiveKit flow:

- `apps/web/src/app/portfolio/portfolio-page.tsx` owns the public desktop/mobile launcher, `HeroSurface`, and current custom `WaveGradientShader`.
- `apps/web/src/app/ask/page.tsx` owns the standalone ask route and desktop ask layout.
- `apps/web/src/app/testing/testing-session.tsx` wires `TestingSession` to the visual chat shell.
- `apps/web/src/app/testing/use-livekit-session-controller.ts` owns startup, pending reply timeout, dispatch ensure, message queueing, and user-facing LiveKit errors.
- `apps/web/src/server/livekit/guest-session.ts` and `apps/web/src/app/api/livekit/guest-session/route.ts` own server-side guest sessions, room creation, and dispatch ensure.

### LiveKit Flow

Keep the current guest session approach: the server creates the LiveKit room with agent dispatch metadata, stores the guest session in Redis, and returns a short-lived participant token. After the client connects, it calls the guest-session endpoint with `ensure_dispatch: true` for the same persona/session metadata.

Update the client controller to treat agent readiness as distinct from room connection. The connection can be `Connected` while the Cloud Agent is still waking. The first-reply timeout should start only after the message has actually been sent live, and the startup path should have a longer bounded readiness timeout for the first agent join/listening state. Errors should keep separate labels for:

- Guest endpoint preflight failed.
- Browser/LiveKit session start failed.
- Guest dispatch ensure failed.
- Agent did not join/listen in time.
- Agent joined but did not answer the latest message in time.

Add or update tests around pending reply timing so queued messages do not time out while the session is connected but the agent is still unavailable.

### LiveKit Verification

Use the existing CLI smoke pattern, but wait long enough for a sleeping Cloud Agent:

1. Create a unique smoke room.
2. Create dispatch for `dennis-portfolio-agent`.
3. Poll dispatch list and participant list for up to 60 seconds.
4. Confirm an `agent-*` participant appears.
5. Run the browser ask regression and confirm a non-empty AI reply.
6. Delete the smoke room.

Because LiveKit MCP tools were unavailable in this session, billing verification remains an operator/dashboard step unless the MCP becomes available later. The implementation should not hard-code a billing conclusion into user-facing copy.

### Divider

Move the Figma bottom divider to the section/grid container that wraps the hero and sidebar on desktop, so it spans the complete first viewport band. Restore or preserve the sidebar left divider by avoiding blanket `border-0` overrides where they remove the Figma-required separator; if an override is needed for height/layout, override only the relevant side.

### Shader

Replace `WaveGradientShader` with a small Paper shader component inside `HeroSurface`. Prefer a layered composition using existing `@paper-design/shaders-react` exports, such as `MeshGradient` or `GrainGradient` plus subtle `PaperTexture`, tuned to the Figma palette. Keep `HeroSurface`'s fallback `bg-[#075970]` or a tokenized equivalent behind the shader.

The shader component should be client-only, absolutely positioned, `pointer-events-none`, and cover the full hero area. It should avoid decorative cards, orbs, or unrelated overlays. The hero copy remains above it with the current first-viewport placement.

## MVP Scope

Ship first:

- LiveKit controller timeout/error handling improvements.
- A longer, documented smoke command or regression script update for cold-starting Cloud Agents.
- Desktop bottom divider and sidebar divider restoration.
- Paper shader replacement for the portfolio hero.
- Focused tests for changed controller/message behavior and existing visual component expectations.

Defer:

- LiveKit billing automation unless a LiveKit MCP/dashboard billing API is made available.
- Redesigning the mobile ask route beyond preserving existing behavior.
- Changing the deployed agent model/provider unless billing or Cloud logs explicitly require it.

## Open Questions

- Can the LiveKit MCP or dashboard billing view be made available for direct account billing verification?
- What production cold-start budget is acceptable: 30 seconds, 45 seconds, or 60 seconds before telling the user the agent could not join?
- Should the portfolio page show an intermediate "waking the agent" state before the first user message, or keep the current chat-first interaction and only improve the timeout/error behavior?
