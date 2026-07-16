from __future__ import annotations

import logging
import os
import shutil
import subprocess
import sys
from contextlib import asynccontextmanager
from typing import AsyncIterator

from dotenv import load_dotenv
from livekit import agents
from livekit.agents import (
    Agent,
    AgentSession,
    JobContext,
    RunContext,
    function_tool,
    inference,
)

from agent_web_search import (
    LiveKitRpcSearchToolStatusNotifier,
    SearchToolStatusNotifier,
    run_web_search_tool,
)
from web_search import (
    WebSearchSettings,
    create_default_http_client,
    create_search_provider,
    load_web_search_settings,
)
from web_search_constants import (
    DEFAULT_WEB_SEARCH_MAX_RESULTS,
    DEFAULT_WEB_SEARCH_PROVIDER,
    DEFAULT_WEB_SEARCH_TIMEOUT_SECONDS,
    PROVIDER_SECRET_NAMES,
    WEB_SEARCH_MAX_RESULTS_ENV,
    WEB_SEARCH_PROVIDER_ENV,
    WEB_SEARCH_TIMEOUT_SECONDS_ENV,
)

load_dotenv()

logger = logging.getLogger("portfolio_agent")

INFISICAL_PROJECT_ID = os.getenv(
    "INFISICAL_PROJECT_ID",
    "87922978-15ad-4880-add7-5ae10dbff217",
)
INFISICAL_ENV = os.getenv("INFISICAL_ENV", "dev")
INFISICAL_BOOTSTRAPPED = "LIVEKIT_AGENT_INFISICAL_BOOTSTRAPPED"
REQUIRED_ENV_VARS = (
    "LIVEKIT_URL",
    "LIVEKIT_API_KEY",
    "LIVEKIT_API_SECRET",
    "LIVEKIT_AGENT_TTS_VOICE_ID",
)

AGENT_NAME = os.getenv("LIVEKIT_AGENT_NAME", "dennis-portfolio-agent")
STT_MODEL = os.getenv("LIVEKIT_AGENT_STT_MODEL", "deepgram/nova-3")
STT_LANGUAGE = os.getenv("LIVEKIT_AGENT_STT_LANGUAGE", "en")
LLM_MODEL = os.getenv("LIVEKIT_AGENT_LLM_MODEL", "google/gemini-2.5-flash-lite")
TTS_MODEL = os.getenv("LIVEKIT_AGENT_TTS_MODEL", "cartesia/sonic-3.5")
TTS_VOICE_ID = os.getenv("LIVEKIT_AGENT_TTS_VOICE_ID")

INSTRUCTIONS = " ".join(
    [
        "You are Dennis's portfolio voice agent.",
        "Keep responses short, warm, and useful for an end-to-end realtime voice test.",
        "When the user asks who you are, say you are the Dennis portfolio test agent.",
        "You have access to the search_web tool for live web information.",
        "The search_web tool uses the configured web search provider: Parallel, Exa, or Perplexity.",
        "Use search_web before answering questions about current, latest, today, weather, news, prices, schedules, docs, versions, recent releases, or other freshness-sensitive facts.",
        "Live sports scores and match results are freshness-sensitive; search_web must be used before answering them.",
        "Do not say you cannot check the web or current weather; call search_web first and answer from the result.",
        "If web search fails, say that web search failed and include the reason.",
        "Avoid long lists unless the user asks for detail.",
    ]
)


def _default_provider_factory(settings: WebSearchSettings, http_client):
    return create_search_provider(settings, http_client)


def _default_notifier_factory() -> SearchToolStatusNotifier:
    from livekit.agents import get_job_context

    return LiveKitRpcSearchToolStatusNotifier(get_job_context().room)


class PortfolioAgent(Agent):
    def __init__(
        self,
        *,
        agent_id: str,
        instructions: str,
        search_settings: WebSearchSettings | None = None,
        provider_factory=_default_provider_factory,
        http_client_factory=create_default_http_client,
        notifier_factory=_default_notifier_factory,
    ) -> None:
        super().__init__(id=agent_id, instructions=instructions)
        self.search_settings = search_settings or load_web_search_settings(os.environ)
        self.provider_factory = provider_factory
        self.http_client_factory = http_client_factory
        self.notifier_factory = notifier_factory

    @function_tool()
    async def search_web(
        self,
        context: RunContext,
        summary: str,
        query: str,
    ) -> str:
        """
        Search the live web using the configured web search provider.

        Use this tool whenever the user asks about current, latest, today,
        live, realtime, weather, news, prices, schedules, sports scores,
        match results, pricing, docs, versions, recent releases, or any fact
        that may have changed since the model's training data. The configured
        provider can be Parallel, Exa, or Perplexity depending on
        WEB_SEARCH_PROVIDER.

        Args:
            summary: A short user-friendly summary of what is being searched.
            query: The full freshness-sensitive web search query.
        """
        logger.info(
            "search_web_tool_invoked provider=%s summary=%r query=%r",
            self.search_settings.provider,
            summary,
            _truncate_for_log(query),
        )
        async with _search_progress_context(context):
            async with self.http_client_factory() as http_client:
                return await run_web_search_tool(
                    summary=summary,
                    query=query,
                    provider=self.provider_factory(self.search_settings, http_client),
                    notifier=self.notifier_factory(),
                    max_results=self.search_settings.max_results,
                    timeout_seconds=self.search_settings.timeout_seconds,
                )


def _truncate_for_log(value: str, max_chars: int = 240) -> str:
    value = " ".join(value.split())
    if len(value) <= max_chars:
        return value
    return f"{value[: max_chars - 3].rstrip()}..."


@asynccontextmanager
async def _search_progress_context(context: RunContext | None) -> AsyncIterator[None]:
    if context is None:
        yield
        return

    async with context.with_filler(
        "I'm checking the web now.",
        delay=1.5,
        max_steps=1,
    ):
        yield


def missing_required_env() -> list[str]:
    return [key for key in REQUIRED_ENV_VARS if not os.getenv(key)]


def print_env_doctor() -> int:
    missing = missing_required_env()
    print("LiveKit agent environment")
    print(f"  INFISICAL_PROJECT_ID: {INFISICAL_PROJECT_ID}")
    print(f"  INFISICAL_ENV: {INFISICAL_ENV}")
    print(f"  LIVEKIT_AGENT_NAME: {AGENT_NAME}")
    print(f"  LIVEKIT_AGENT_STT_MODEL: {STT_MODEL}")
    print(f"  LIVEKIT_AGENT_STT_LANGUAGE: {STT_LANGUAGE}")
    print(f"  LIVEKIT_AGENT_LLM_MODEL: {LLM_MODEL}")
    print(f"  LIVEKIT_AGENT_TTS_MODEL: {TTS_MODEL}")
    print(f"  LIVEKIT_AGENT_TTS_VOICE_ID: {'set' if TTS_VOICE_ID else 'missing'}")
    print(
        "  WEB_SEARCH_PROVIDER: "
        f"{os.getenv(WEB_SEARCH_PROVIDER_ENV, DEFAULT_WEB_SEARCH_PROVIDER)}"
    )
    print(
        "  WEB_SEARCH_MAX_RESULTS: "
        f"{os.getenv(WEB_SEARCH_MAX_RESULTS_ENV, str(DEFAULT_WEB_SEARCH_MAX_RESULTS))}"
    )
    print(
        "  WEB_SEARCH_TIMEOUT_SECONDS: "
        f"{os.getenv(
            WEB_SEARCH_TIMEOUT_SECONDS_ENV,
            str(int(DEFAULT_WEB_SEARCH_TIMEOUT_SECONDS)),
        )}"
    )
    for key in PROVIDER_SECRET_NAMES.values():
        print(f"  {key}: {'set' if os.getenv(key) else 'missing'}")

    for key in REQUIRED_ENV_VARS:
        print(f"  {key}: {'set' if os.getenv(key) else 'missing'}")

    if missing:
        print()
        print("Missing required env vars:")
        for key in missing:
            print(f"  - {key}")
        print()
        print("Fill these in Infisical, then rerun the same command.")
        return 1

    print()
    print("Environment looks ready for local LiveKit agent testing.")
    return 0


def bootstrap_from_infisical_if_needed() -> None:
    if not missing_required_env():
        return

    if os.getenv(INFISICAL_BOOTSTRAPPED) == "1":
        raise SystemExit(print_env_doctor())

    infisical = shutil.which("infisical")
    if not infisical:
        raise SystemExit(
            "Missing required LiveKit/agent env vars and could not find the "
            "`infisical` CLI. Install/login to Infisical or run the agent with "
            "`infisical run --projectId ... --env=dev -- <command>`."
        )

    command = [
        infisical,
        "run",
        "--projectId",
        INFISICAL_PROJECT_ID,
        "--env",
        INFISICAL_ENV,
        "--",
        sys.executable,
        *sys.argv,
    ]
    env = {
        **os.environ,
        INFISICAL_BOOTSTRAPPED: "1",
        "INFISICAL_PROJECT_ID": INFISICAL_PROJECT_ID,
        "INFISICAL_ENV": INFISICAL_ENV,
    }

    completed = subprocess.run(command, env=env, check=False)
    raise SystemExit(completed.returncode)


async def entrypoint(ctx: JobContext) -> None:
    await ctx.connect()

    logger.info(
        "portfolio_agent_job_connected agent_name=%s room=%s job_id=%s",
        AGENT_NAME,
        ctx.room.name,
        getattr(ctx.job, "id", "unknown"),
    )

    session = AgentSession(
        stt=inference.STT(
            model=STT_MODEL,
            language=STT_LANGUAGE,
        ),
        llm=inference.LLM(
            model=LLM_MODEL,
        ),
        tts=inference.TTS(
            model=TTS_MODEL,
            voice=TTS_VOICE_ID,
        ),
    )

    register_session_observability(session)

    await session.start(
        room=ctx.room,
        agent=PortfolioAgent(agent_id=AGENT_NAME, instructions=INSTRUCTIONS),
        record={
            "audio": True,
            "logs": True,
            "traces": True,
            "transcript": True,
        },
    )

    logger.info(
        "portfolio_agent_session_started agent_name=%s room=%s llm_model=%s",
        AGENT_NAME,
        ctx.room.name,
        LLM_MODEL,
    )

    await session.generate_reply(
        instructions=(
            "Greet the user briefly and say you are ready for a quick voice test."
        ),
    )


def register_session_observability(session: AgentSession) -> None:
    @session.on("user_input_transcribed")
    def _on_user_input_transcribed(event) -> None:
        if event.is_final:
            logger.info(
                "user_input_transcribed text=%r",
                _truncate_for_log(event.transcript),
            )

    @session.on("agent_state_changed")
    def _on_agent_state_changed(event) -> None:
        logger.debug(
            "agent_state_changed old=%s new=%s",
            event.old_state,
            event.new_state,
        )

    @session.on("conversation_item_added")
    def _on_conversation_item_added(event) -> None:
        item = event.item
        text = getattr(item, "text_content", None)
        role = getattr(item, "role", "unknown")
        if text:
            logger.info(
                "conversation_item_added role=%s text=%r",
                role,
                _truncate_for_log(text),
            )

    @session.on("function_tools_executed")
    def _on_function_tools_executed(event) -> None:
        for function_call, function_output in event.zipped():
            logger.info(
                "function_tool_executed name=%s call_id=%s is_error=%s output_chars=%s arguments=%r",
                function_call.name,
                function_call.call_id,
                getattr(function_output, "is_error", None),
                len(function_output.output) if function_output else 0,
                _truncate_for_log(function_call.arguments),
            )

    @session.on("error")
    def _on_error(event) -> None:
        error = event.error
        exc_info = (
            (type(error), error, error.__traceback__)
            if isinstance(error, BaseException)
            else None
        )
        logger.error(
            "agent_session_error source=%r error=%r",
            event.source,
            error,
            exc_info=exc_info,
        )


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "doctor":
        raise SystemExit(print_env_doctor())

    bootstrap_from_infisical_if_needed()

    agents.cli.run_app(
        agents.WorkerOptions(
            entrypoint_fnc=entrypoint,
            agent_name=AGENT_NAME,
        )
    )
