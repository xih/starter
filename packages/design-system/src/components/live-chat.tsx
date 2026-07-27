"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";

import { cn } from "../utils";
import { VoiceAvatar } from "./voice";

export type LiveChatMessage = {
  avatarUrl: string;
  handle: string;
  id: string;
  text: string;
};

type ActiveLiveChatMessage = LiveChatMessage & {
  enteredAt: number;
  streamId: string;
};

export type LiveChatProps = {
  autoScrollOnNewMessage?: boolean;
  className?: string;
  fadeDurationMs?: number;
  height?: number | string;
  initialMessageCount?: number;
  isLayoutAnimated?: boolean;
  isPaused?: boolean;
  isScrollable?: boolean;
  maxRetainedMessages?: number;
  maxVisibleMessages?: number;
  messages?: LiveChatMessage[];
  reserveFadingMessages?: boolean;
  preserveExitingMessages?: boolean;
  retainHistory?: boolean;
  streamIntervalMs?: number;
  tone?: "light" | "dark";
  verticalAlign?: "start" | "end";
  visibleDurationMs?: number;
};

type LiveChatModuleStreamProps = Pick<
  LiveChatProps,
  | "autoScrollOnNewMessage"
  | "fadeDurationMs"
  | "initialMessageCount"
  | "isPaused"
  | "maxRetainedMessages"
  | "maxVisibleMessages"
  | "messages"
  | "streamIntervalMs"
  | "tone"
  | "visibleDurationMs"
>;

export type LiveChatModuleProps = LiveChatModuleStreamProps & {
  chatClassName?: string;
  className?: string;
  defaultMinimized?: boolean;
  height?: number | string;
  isMinimized?: boolean;
  label?: string;
  onMinimizedChange?: (isMinimized: boolean) => void;
};

const avatarUrl = (handle: string) => `https://unavatar.io/twitter/${handle}`;

const DESIGN_TWITTER_AUTHORS = [
  "joshwcomeau",
  "steveschoger",
  "danmall",
  "jina",
  "brad_frost",
  "lukeW",
  "khoi",
  "maggieappleton",
  "vanschneider",
  "awilkinson",
  "davidhoang",
  "rsms",
  "craftui",
  "yitongzhang",
  "femkesvs",
  "charliMarieTV",
  "rafahari",
  "miggi",
  "rianvdm",
  "jackbutcher",
] as const;

const DESIGN_TWITTER_LINES = [
  "the rhythm of this feed feels like a prototype crit happening in public",
  "tiny spacing moves are doing all the emotional labor here",
  "this is giving launch-day Loom comments but make it portfolio",
  "strong reminder that motion timing is product voice",
  "the avatar stack already makes the interface feel alive",
  "I want the fade to feel like a thought leaving the room",
  "design twitter would absolutely overthink this hover state for 48 hours",
  "the restraint is doing more than another glass panel would",
  "feels like the chat should arrive with confidence, then politely disappear",
  "caption type at this size is the whole game",
  "the density feels closer to YouTube live than customer support chat",
  "please keep the messages imperfect, perfect chat copy feels fake",
  "that newest-message highlight is a nice little attention cue",
  "this should probably loop forever in the hero and never feel canned",
  "the best part is how little chrome the component needs",
  "design systems are just vibes with constraints and receipts",
  "I can hear someone saying ship the messy prototype by Friday",
  "the readable fade matters more than the entrance animation",
  "portfolio chat as ambient social proof is a very 2026 move",
  "make the stream fast enough to feel live, slow enough to read",
  "this would be delightful next to a voice control bar",
  "the borderless overlay lets the avatars pop without asking for attention",
  "I like when the newest message lands like a soft notification",
  "this component is basically a tiny party for product taste",
  "the line-height token is carrying the entire layout",
  "mobile needs two messages max or it turns into soup",
  "desktop can breathe with four messages and a longer fade",
  "actual handles make the simulation feel strangely believable",
  "I would tune this with the product soundtrack playing",
  "the trick is making fake live chat not look fake",
  "every portfolio needs one questionable but memorable interaction",
  "good hardcoded data is still design work",
  "the chat should feel like people are reacting to the work, not explaining it",
  "we need at least one spicy typography comment in here",
  "I will always click the thing that looks like it is currently alive",
  "the dark canvas keeps this from fighting the hero media",
  "someone in design twitter is already asking about easing curves",
  "the stream cadence is the personality slider",
  "a little opacity falloff can make the whole thing feel cinematic",
  "this is one of those components where 2px is a product decision",
  "I like that the rows are almost boring until they move",
  "the best live UI does not announce itself as live UI",
  "more comments about systems, fewer comments about pixels",
  "the control knobs are going to save a thousand rebuilds",
  "I would add one message that only says token debt",
  "there is a whole brand voice hiding in these tiny rows",
  "the absence of borders is correct here",
  "the avatar crop needs to be ruthless",
  "messages should expire like chat, not collapse like a todo list",
  "this feels like Twitch chat went to design school",
  "YouTube live but with better kerning",
  "the highlighted row needs to be subtle enough to miss on purpose",
  "I am pro fake crowd noise when the product is a portfolio",
  "the stream is doing exposition without becoming a paragraph",
  "hardcoded is fine when the point is motion and feel",
  "this would make a killer component state in the design system",
  "the chat should reward peripheral vision",
  "please keep the handles muted, the message is the foreground",
  "I want one comment that feels like a Figma file got opened at midnight",
  "the fade should be slower than the entrance by a lot",
  "new messages need a tiny lift, not a bounce",
  "we are officially in ambient interface territory",
  "the component has to survive very long names and weird takes",
  "this is why real copy beats lorem ipsum every time",
  "someone is going to screenshot this and ask what library it is",
  "the good version feels observed, not narrated",
  "design twitter replies are basically micro case studies",
  "the spacing token names are doing a very polite drumroll",
  "I would use this as a footer easter egg too",
  "the row hover variant is giving proper design-system maturity",
  "a live portfolio should feel less like a page and more like a room",
  "the messages need enough variance to avoid the slot-machine feel",
  "this is such a good place to test brand warmth",
  "make it editable in Storybook and the debate gets easier",
  "I can already imagine the mobile crop sitting above the control bar",
  "if this gets too fast it becomes stock ticker energy",
  "if it gets too slow it becomes a testimonial carousel",
  "the sweet spot is somewhere between gossip and ambience",
  "the avatars should be known enough to feel like a wink",
  "this is product narrative without another hero paragraph",
  "I like components that give the page a pulse",
  "the interface is tiny but the implication is big",
  "please do not let the chat bubble aesthetic win",
  "flat rows are much closer to stream culture",
  "the component should feel native to the portfolio, not embedded",
  "I would keep the max-width exact and let the parent place it",
  "the mobile version probably wants a stricter height clamp",
  "this reads as social context, not support chat",
  "the newest row highlight can double as the entrance state",
  "I want enough copy length to prove wrapping works",
  "the typography is small, so contrast has to be honest",
  "design twitter is mostly layout therapy with avatars",
  "this could be a surprisingly good proof of taste",
  "the 24px avatar makes the whole thing feel stream-native",
  "no cards inside cards, just rows doing row things",
  "this is a component I would absolutely over-tune",
  "the live feeling comes from removal timing as much as insertion",
  "there is a beautiful line between ambient and distracting",
  "keep the stream legible and let the page do the drama",
  "this belongs in Storybook before it earns a production slot",
] as const;

export const DESIGN_TWITTER_LIVE_CHAT_MESSAGES: LiveChatMessage[] =
  DESIGN_TWITTER_LINES.map((text, index) => {
    const handle =
      DESIGN_TWITTER_AUTHORS[index % DESIGN_TWITTER_AUTHORS.length] ??
      "joshwcomeau";

    return {
      avatarUrl: avatarUrl(handle),
      handle: `@${handle}`,
      id: `design-twitter-${index + 1}`,
      text,
    };
  });

const FALLBACK_LIVE_CHAT_MESSAGE: LiveChatMessage = {
  avatarUrl: avatarUrl("joshwcomeau"),
  handle: "@joshwcomeau",
  id: "design-twitter-fallback",
  text: "the live chat should feel ambient, readable, and tuned with intent",
};

const getMessageAt = (
  messages: readonly LiveChatMessage[],
  index: number,
): LiveChatMessage =>
  messages[index % messages.length] ??
  DESIGN_TWITTER_LIVE_CHAT_MESSAGES[
    index % DESIGN_TWITTER_LIVE_CHAT_MESSAGES.length
  ] ??
  FALLBACK_LIVE_CHAT_MESSAGE;

type LiveChatMessageRowProps = {
  blur?: number;
  className?: string;
  fadeDurationMs?: number;
  isLayoutAnimated?: boolean;
  message: LiveChatMessage;
  opacity?: number;
  tone?: "light" | "dark";
};

export const LiveChatMessageRow = forwardRef<
  HTMLElement,
  LiveChatMessageRowProps
>(function LiveChatMessageRow(
  {
    className,
    message,
    blur = 0,
    opacity = 1,
    fadeDurationMs = 900,
    isLayoutAnimated = true,
    tone = "light",
  },
  ref,
) {
  return (
    <motion.article
      aria-label={`${message.handle}: ${message.text}`}
      className={cn(
        "gap-token-8 px-token-8 py-token-4 flex w-full shrink-0 items-start",
        "rounded-token-xxs transition-colors",
        tone === "dark"
          ? "hover:bg-[var(--color-background-hovered)]"
          : "hover:bg-[rgba(243,243,243,0.2)]",
        className,
      )}
      ref={ref}
      initial={false}
      layout={isLayoutAnimated ? "position" : false}
      animate={{
        filter: `blur(${blur}px)`,
        opacity,
      }}
      transition={{
        filter: { duration: fadeDurationMs / 1000, ease: "easeOut" },
        layout: { duration: 0.28, ease: [0.2, 0, 0, 1] },
        opacity: { duration: fadeDurationMs / 1000, ease: "easeOut" },
      }}
      exit={{
        filter: "blur(4px)",
        opacity: 0,
      }}
    >
      <div className="pt-token-4 flex w-[32px] shrink-0 items-start">
        <VoiceAvatar
          avatar={message.avatarUrl}
          className="bg-[var(--color-background-secondary)]"
          name={message.handle}
          size={24}
        />
      </div>
      <div className="gap-token-4 flex min-w-0 flex-1 flex-col justify-center py-[0.5px]">
        <p
          className={cn(
            "font-body text-caption font-semibold",
            tone === "dark" ? "text-[#8f8f8f]" : "text-white",
          )}
        >
          {message.handle}
        </p>
        <p
          className={cn(
            "font-body text-caption font-normal [word-break:break-word]",
            tone === "dark" ? "text-[#121318]" : "text-white",
          )}
        >
          {message.text}
        </p>
      </div>
    </motion.article>
  );
});

LiveChatMessageRow.displayName = "LiveChatMessageRow";

export function LiveChat({
  autoScrollOnNewMessage = true,
  className,
  fadeDurationMs = 900,
  height,
  initialMessageCount = 4,
  isLayoutAnimated = true,
  isPaused = false,
  isScrollable = false,
  maxRetainedMessages,
  maxVisibleMessages = 4,
  messages = DESIGN_TWITTER_LIVE_CHAT_MESSAGES,
  reserveFadingMessages = true,
  preserveExitingMessages,
  retainHistory = false,
  streamIntervalMs = 1200,
  tone = "light",
  verticalAlign = "end",
  visibleDurationMs = 3600,
}: LiveChatProps) {
  const resolvedMessages = messages.length
    ? messages
    : DESIGN_TWITTER_LIVE_CHAT_MESSAGES;
  const resolvedMaxVisibleMessages = Math.max(1, maxVisibleMessages);
  const shouldPreserveExitingMessages =
    preserveExitingMessages ?? reserveFadingMessages;
  const messageLifetimeMs = visibleDurationMs + fadeDurationMs;
  const activeMessageLimit = retainHistory
    ? Math.max(1, maxRetainedMessages ?? resolvedMessages.length)
    : resolvedMaxVisibleMessages +
      (shouldPreserveExitingMessages
        ? Math.max(
            1,
            Math.ceil(fadeDurationMs / Math.max(80, streamIntervalMs)),
          )
        : 0);
  const seededMessages = useMemo(() => {
    const count = Math.min(
      initialMessageCount,
      resolvedMaxVisibleMessages,
      resolvedMessages.length,
    );
    const baseTime = Date.now() - Math.max(0, count - 1) * streamIntervalMs;

    return Array.from({ length: count }, (_, index) => {
      const message = getMessageAt(resolvedMessages, index);

      return {
        ...message,
        enteredAt: baseTime + index * streamIntervalMs,
        streamId: `${message.id}-seed-${index}`,
      };
    });
  }, [
    initialMessageCount,
    resolvedMaxVisibleMessages,
    resolvedMessages,
    streamIntervalMs,
  ]);
  const [activeMessages, setActiveMessages] =
    useState<ActiveLiveChatMessage[]>(seededMessages);
  const messageIndexRef = useRef(seededMessages.length);
  const scrollRef = useRef<HTMLElement>(null);
  const [now, setNow] = useState(() => Date.now());
  const shouldAutoScrollRef = useRef(true);
  const trimMessages = useCallback(
    (currentMessages: ActiveLiveChatMessage[], timestamp: number) =>
      (retainHistory
        ? currentMessages
        : currentMessages.filter(
            (message) => timestamp - message.enteredAt < messageLifetimeMs,
          )
      ).slice(-activeMessageLimit),
    [activeMessageLimit, messageLifetimeMs, retainHistory],
  );

  useEffect(() => {
    setActiveMessages(seededMessages);
    messageIndexRef.current = seededMessages.length;
  }, [seededMessages]);

  useEffect(() => {
    if (isPaused) {
      return;
    }

    const tick = window.setInterval(() => {
      const timestamp = Date.now();

      setNow(timestamp);
      setActiveMessages((currentMessages) =>
        trimMessages(currentMessages, timestamp),
      );
    }, 120);

    return () => window.clearInterval(tick);
  }, [isPaused, trimMessages]);

  useEffect(() => {
    if (isPaused) {
      return;
    }

    const interval = window.setInterval(
      () => {
        const timestamp = Date.now();
        const nextIndex = messageIndexRef.current;
        const nextMessage = getMessageAt(resolvedMessages, nextIndex);

        setActiveMessages((currentMessages) => {
          return trimMessages(
            [
              ...currentMessages,
              {
                ...nextMessage,
                enteredAt: timestamp,
                streamId: `${nextMessage.id}-${timestamp}`,
              },
            ],
            timestamp,
          );
        });
        messageIndexRef.current = nextIndex + 1;
        setNow(timestamp);
      },
      Math.max(80, streamIntervalMs),
    );

    return () => window.clearInterval(interval);
  }, [isPaused, resolvedMessages, streamIntervalMs, trimMessages]);

  useLayoutEffect(() => {
    const scrollElement = scrollRef.current;

    if (!scrollElement || !isScrollable || !autoScrollOnNewMessage) {
      return;
    }

    if (!shouldAutoScrollRef.current) {
      return;
    }

    const animationFrame = window.requestAnimationFrame(() => {
      scrollElement.scrollTop =
        scrollElement.scrollHeight - scrollElement.clientHeight;
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [activeMessages.length, autoScrollOnNewMessage, isScrollable]);

  const handleScroll = () => {
    const scrollElement = scrollRef.current;

    if (!scrollElement) {
      return;
    }

    const distanceFromBottom =
      scrollElement.scrollHeight -
      scrollElement.scrollTop -
      scrollElement.clientHeight;

    shouldAutoScrollRef.current = distanceFromBottom < 24;
  };

  return (
    <section
      aria-label="Live chat"
      className={cn(
        "w-full max-w-[423px]",
        isScrollable
          ? [
              "block overflow-x-hidden overflow-y-auto overscroll-contain pr-[6px]",
              "[scrollbar-color:#8f8f8f_transparent] [scrollbar-gutter:stable]",
              "[scrollbar-width:thin] [&::-webkit-scrollbar]:w-[6px]",
              "[&::-webkit-scrollbar-track]:bg-transparent",
              "[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#8f8f8f]",
            ]
          : cn(
              "flex flex-col overflow-hidden",
              verticalAlign === "start" ? "justify-start" : "justify-end",
            ),
        className,
      )}
      onScroll={isScrollable ? handleScroll : undefined}
      ref={scrollRef}
      role="log"
      style={height === undefined ? undefined : { height }}
    >
      <div
        className={cn(
          "gap-token-2 flex w-full flex-col",
          isScrollable && "min-h-full",
          verticalAlign === "start" ? "justify-start" : "justify-end",
        )}
      >
        <AnimatePresence initial={false} mode="popLayout">
          {activeMessages.map((message) => {
            const age = now - message.enteredAt;
            const fadeProgress =
              retainHistory || age <= visibleDurationMs
                ? 0
                : Math.min(1, (age - visibleDurationMs) / fadeDurationMs);

            return (
              <LiveChatMessageRow
                blur={fadeProgress * 4}
                fadeDurationMs={fadeDurationMs}
                isLayoutAnimated={isLayoutAnimated}
                key={message.streamId}
                message={message}
                opacity={1 - fadeProgress}
                tone={tone}
              />
            );
          })}
        </AnimatePresence>
      </div>
    </section>
  );
}

export function LiveChatModule({
  autoScrollOnNewMessage,
  chatClassName,
  className,
  defaultMinimized = false,
  fadeDurationMs,
  height = 337,
  initialMessageCount,
  isMinimized,
  isPaused,
  maxRetainedMessages,
  label = "Live Chat",
  maxVisibleMessages,
  messages,
  onMinimizedChange,
  streamIntervalMs,
  tone = "dark",
  visibleDurationMs,
}: LiveChatModuleProps) {
  const [internalMinimized, setInternalMinimized] = useState(defaultMinimized);
  const resolvedMinimized = isMinimized ?? internalMinimized;

  const toggleMinimized = () => {
    const nextMinimized = !resolvedMinimized;
    setInternalMinimized(nextMinimized);
    onMinimizedChange?.(nextMinimized);
  };

  return (
    <motion.aside
      aria-label={label}
      className={cn(
        "flex w-[371px] max-w-full flex-col items-start gap-[10px] overflow-hidden rounded-[16px] bg-white p-[10px] text-[#121318]",
        "shadow-[0_16px_40px_-8px_rgba(15,23,42,0.14),0_4px_8px_-2px_rgba(15,23,42,0.12)]",
        className,
      )}
      data-state={resolvedMinimized ? "minimized" : "maximized"}
      initial={false}
      layout
      transition={{ duration: 0.28, ease: [0.2, 0, 0, 1] }}
    >
      <button
        aria-expanded={!resolvedMinimized}
        className="font-body flex h-[20px] w-full touch-manipulation items-center gap-[10px] text-left text-[16px] leading-[20px] text-[#121318]"
        onClick={toggleMinimized}
        type="button"
      >
        <span className="min-w-0 flex-1">{label}</span>
        <span
          aria-hidden
          className={cn(
            "h-[2px] w-[21px] shrink-0 bg-[#0b0b12] transition-transform duration-200",
            resolvedMinimized ? "rotate-90" : "rotate-0",
          )}
        />
      </button>
      <AnimatePresence initial={false}>
        {resolvedMinimized ? null : (
          <motion.div
            animate={{ height: "auto", opacity: 1 }}
            className="w-full overflow-hidden"
            exit={{ height: 0, opacity: 0 }}
            initial={{ height: 0, opacity: 0 }}
            key="live-chat-body"
            transition={{ duration: 0.28, ease: [0.2, 0, 0, 1] }}
          >
            <LiveChat
              autoScrollOnNewMessage={autoScrollOnNewMessage}
              className={cn("max-w-none", chatClassName)}
              fadeDurationMs={fadeDurationMs}
              height={height}
              initialMessageCount={initialMessageCount}
              isLayoutAnimated={false}
              isPaused={isPaused}
              isScrollable
              maxRetainedMessages={maxRetainedMessages}
              maxVisibleMessages={maxVisibleMessages}
              messages={messages}
              preserveExitingMessages={false}
              retainHistory
              streamIntervalMs={streamIntervalMs}
              tone={tone}
              verticalAlign="end"
              visibleDurationMs={visibleDurationMs}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.aside>
  );
}
