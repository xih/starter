from __future__ import annotations

import os
import shutil
import subprocess
import sys

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
        "Use search_web before answering questions about current, latest, today, weather, news, prices, schedules, or other freshness-sensitive facts.",
        "Do not say you cannot check the web or current weather; call search_web first and answer from the result.",
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
        Search the live web for current information.

        Args:
            summary: A short user-friendly summary of what is being searched.
            query: The full freshness-sensitive web search query.
        """
        async with self.http_client_factory() as http_client:
            return await run_web_search_tool(
                summary=summary,
                query=query,
                provider=self.provider_factory(self.search_settings, http_client),
                notifier=self.notifier_factory(),
                max_results=self.search_settings.max_results,
                timeout_seconds=self.search_settings.timeout_seconds,
            )


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

    await session.start(
        room=ctx.room,
        agent=PortfolioAgent(agent_id=AGENT_NAME, instructions=INSTRUCTIONS),
    )

    await session.generate_reply(
        instructions=(
            "Greet the user briefly and say you are ready for a quick voice test."
        ),
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
