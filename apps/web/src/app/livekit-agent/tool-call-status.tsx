import { SourcesRail, type SourceData } from "@starter/design-system";
import { CheckCircle2, Loader2, Search, XCircle } from "lucide-react";

import { cn } from "~/lib/utils";

export type ToolCallSource = SourceData;

export type ToolCallStatus = {
  error?: string;
  provider: string;
  sources?: ToolCallSource[];
  startedAt: number;
  state: "running" | "completed" | "failed";
  summary: string;
};

export type ToolCallStatusAction =
  | {
      provider: ToolCallStatus["provider"];
      summary: string;
      type: "started";
    }
  | {
      provider: ToolCallStatus["provider"];
      sources?: ToolCallSource[];
      summary: string;
      type: "completed";
    }
  | { type: "completed" }
  | {
      error: string;
      provider: ToolCallStatus["provider"];
      summary: string;
      type: "failed";
    }
  | { type: "reset" };

type ToolCallStatusRpcRequest = {
  payload: string;
};

export function toolCallStatusReducer(
  _status: ToolCallStatus | null,
  action: ToolCallStatusAction,
): ToolCallStatus | null {
  switch (action.type) {
    case "started":
      return {
        provider: action.provider,
        startedAt: Date.now(),
        state: "running",
        summary: action.summary,
      };
    case "failed":
      return {
        error: action.error,
        provider: action.provider,
        startedAt: Date.now(),
        state: "failed",
        summary: action.summary,
      };
    case "completed":
      if ("provider" in action) {
        return {
          provider: action.provider,
          sources: action.sources,
          startedAt: Date.now(),
          state: "completed",
          summary: action.summary,
        };
      }
      return null;
    case "reset":
      return null;
  }
}

export function ToolCallStatusPanel({
  className,
  status,
}: {
  className?: string;
  status: ToolCallStatus | null;
}) {
  if (!status) {
    return null;
  }

  const isCompleted = status.state === "completed";
  const isFailed = status.state === "failed";

  return (
    <section
      className={cn(
        "border border-border bg-background p-3 text-sm",
        isFailed && "border-[var(--color-core-negative)]",
        className,
      )}
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 font-medium">
          {isFailed ? (
            <XCircle className="size-4 text-[var(--color-core-negative)]" />
          ) : isCompleted ? (
            <CheckCircle2 className="size-4 text-[var(--color-core-positive)]" />
          ) : (
            <Loader2 className="size-4 animate-spin" />
          )}
          <span>
            {isFailed
              ? "Search failed"
              : isCompleted
                ? "Search completed"
                : "Searching the web"}
          </span>
        </div>
        <span className="shrink-0 rounded-sm border border-border px-2 py-0.5 text-xs text-muted-foreground">
          {status.provider}
        </span>
      </div>
      <div className="mt-2 flex items-start gap-2 text-muted-foreground">
        <Search className="mt-0.5 size-3.5 shrink-0" />
        <p className="min-w-0">{status.summary}</p>
      </div>
      {status.error ? (
        <p className="mt-2 text-[var(--color-text-negative)]">{status.error}</p>
      ) : null}
      {status.sources?.length ? (
        <SourcesRail className="mt-3" sources={status.sources} />
      ) : null}
    </section>
  );
}

export function createToolCallStatusRpcHandler(
  dispatch: (action: ToolCallStatusAction) => void,
) {
  return async ({ payload }: ToolCallStatusRpcRequest) => {
    try {
      const parsed = JSON.parse(payload) as {
        error?: unknown;
        provider?: unknown;
        sources?: unknown;
        state?: unknown;
        summary?: unknown;
      };

      if (parsed.state === "completed") {
        if (
          typeof parsed.provider === "string" &&
          typeof parsed.summary === "string"
        ) {
          dispatch({
            provider: parsed.provider,
            sources: parseToolCallSources(parsed.sources) ?? undefined,
            summary: parsed.summary,
            type: "completed",
          });
          return "ok";
        }

        dispatch({ type: "completed" });
        return "ok";
      }

      if (
        parsed.state === "running" &&
        typeof parsed.provider === "string" &&
        typeof parsed.summary === "string"
      ) {
        dispatch({
          provider: parsed.provider,
          summary: parsed.summary,
          type: "started",
        });
        return "ok";
      }

      if (
        parsed.state === "failed" &&
        typeof parsed.error === "string" &&
        typeof parsed.provider === "string" &&
        typeof parsed.summary === "string"
      ) {
        dispatch({
          error: parsed.error,
          provider: parsed.provider,
          summary: parsed.summary,
          type: "failed",
        });
        return "ok";
      }
    } catch {
      return "invalid";
    }

    return "invalid";
  };
}

function parseToolCallSources(value: unknown): ToolCallSource[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const sources: ToolCallSource[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const source = item as {
      description?: unknown;
      provider?: unknown;
      published_at?: unknown;
      title?: unknown;
      url?: unknown;
    };

    if (
      typeof source.provider !== "string" ||
      typeof source.title !== "string" ||
      typeof source.url !== "string"
    ) {
      continue;
    }

    sources.push({
      description:
        typeof source.description === "string" ? source.description : undefined,
      provider: source.provider,
      publishedAt:
        typeof source.published_at === "string"
          ? source.published_at
          : undefined,
      title: source.title,
      url: source.url,
    });
  }

  return sources;
}

export function registerToolCallStatusRpc(
  room: {
    localParticipant?: {
      registerRpcMethod?: (
        method: string,
        handler: (request: ToolCallStatusRpcRequest) => Promise<string>,
      ) => void;
      unregisterRpcMethod?: (method: string) => void;
    };
  },
  dispatch: (action: ToolCallStatusAction) => void,
) {
  const method = "livekit_agent_tool_status";
  const handler = createToolCallStatusRpcHandler(dispatch);
  room.localParticipant?.registerRpcMethod?.(method, handler);

  return () => {
    room.localParticipant?.unregisterRpcMethod?.(method);
  };
}
