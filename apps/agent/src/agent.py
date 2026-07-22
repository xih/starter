from __future__ import annotations

import json
import logging
import os
import shutil
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
from contextlib import asynccontextmanager
from dataclasses import dataclass
from typing import Any, AsyncIterator

from dotenv import load_dotenv
from livekit import agents, rtc
from livekit.agents import (
    Agent,
    AgentSession,
    JobContext,
    RunContext,
    function_tool,
    inference,
)
from livekit.plugins import cartesia, openai

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

INFISICAL_PROJECT_ID = os.getenv("INFISICAL_PROJECT_ID")
INFISICAL_ENV = os.getenv("INFISICAL_ENV", "dev")
INFISICAL_BOOTSTRAPPED = "LIVEKIT_AGENT_INFISICAL_BOOTSTRAPPED"
BASE_REQUIRED_ENV_VARS = (
    "LIVEKIT_URL",
    "LIVEKIT_API_KEY",
    "LIVEKIT_API_SECRET",
)

AGENT_NAME = os.getenv("LIVEKIT_AGENT_NAME", "dennis-portfolio-agent")
VALID_AGENT_PROVIDERS = ("openai", "livekit")
AGENT_PROVIDER = "openai"
STT_MODEL = os.getenv("LIVEKIT_AGENT_STT_MODEL", "deepgram/nova-3")
STT_LANGUAGE = os.getenv("LIVEKIT_AGENT_STT_LANGUAGE", "en")
LLM_MODEL = os.getenv("LIVEKIT_AGENT_LLM_MODEL", "google/gemini-2.5-flash-lite")
TTS_MODEL = os.getenv("LIVEKIT_AGENT_TTS_MODEL", "cartesia/sonic-3.5")
TTS_VOICE_ID = os.getenv("LIVEKIT_AGENT_TTS_VOICE_ID")
OPENAI_STT_MODEL = os.getenv("OPENAI_AGENT_STT_MODEL", "whisper-1")
OPENAI_LLM_MODEL = os.getenv("OPENAI_AGENT_LLM_MODEL", "gpt-4o-mini")
OPENAI_TTS_MODEL = os.getenv("OPENAI_AGENT_TTS_MODEL", "tts-1")
OPENAI_TTS_VOICE = os.getenv("OPENAI_AGENT_TTS_VOICE", "alloy")
CARTESIA_API_KEY = os.getenv("CARTESIA_API_KEY")
PERSONA_BASE_URL = os.getenv("LIVEKIT_AGENT_PERSONA_BASE_URL")
PERSONA_READ_SECRET = os.getenv("PERSONA_AGENT_READ_SECRET")
DEFAULT_PERSONA_ID = os.getenv("LIVEKIT_AGENT_DEFAULT_PERSONA_ID", "portfolio-agent")
PERSONA_TTS_SWITCH_RPC_METHOD = "persona.switch_tts"
SESSION_RECORDING_ENABLED_ENV = "LIVEKIT_AGENT_SESSION_RECORDING_ENABLED"
SESSION_RECORD_AUDIO_ENV = "LIVEKIT_AGENT_RECORD_AUDIO"
SESSION_RECORD_LOGS_ENV = "LIVEKIT_AGENT_RECORD_LOGS"
SESSION_RECORD_TRACES_ENV = "LIVEKIT_AGENT_RECORD_TRACES"
SESSION_RECORD_TRANSCRIPT_ENV = "LIVEKIT_AGENT_RECORD_TRANSCRIPT"

DEFAULT_INSTRUCTIONS = " ".join(
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
INSTRUCTIONS = DEFAULT_INSTRUCTIONS


@dataclass(frozen=True)
class PersonaConfig:
    id: str
    agent_id: str
    instructions: str
    greeting: str
    tts_model: str
    tts_voice_id: str | None
    tts_language: str | None
    tts_options: dict[str, Any]
    requires_cartesia_plugin: bool


def default_persona() -> PersonaConfig:
    return PersonaConfig(
        id=DEFAULT_PERSONA_ID,
        agent_id=AGENT_NAME,
        instructions=DEFAULT_INSTRUCTIONS,
        greeting="Greet the user briefly and say you are ready for a quick voice test.",
        tts_model=TTS_MODEL,
        tts_voice_id=TTS_VOICE_ID,
        tts_language=STT_LANGUAGE,
        tts_options={},
        requires_cartesia_plugin=False,
    )


def get_job_metadata(ctx: JobContext) -> dict[str, Any]:
    job = getattr(ctx, "job", None)
    metadata = getattr(job, "metadata", None)

    if not metadata:
        info = getattr(ctx, "info", None)
        metadata = getattr(info, "metadata", None)

    if isinstance(metadata, dict):
        return metadata

    if not isinstance(metadata, str) or not metadata.strip():
        return {}

    try:
        parsed = json.loads(metadata)
    except json.JSONDecodeError:
        return {}

    return parsed if isinstance(parsed, dict) else {}


def fetch_persona_config(persona_id: str, user_id: str | None) -> PersonaConfig:
    fallback = default_persona()

    if not PERSONA_BASE_URL:
        if persona_id != DEFAULT_PERSONA_ID:
            raise RuntimeError(
                "LIVEKIT_AGENT_PERSONA_BASE_URL is required for non-default persona dispatch."
            )
        return fallback

    base_url = PERSONA_BASE_URL.rstrip("/")
    query = urllib.parse.urlencode({"user_id": user_id or ""})
    url = f"{base_url}/api/personas/{urllib.parse.quote(persona_id)}/agent?{query}"
    request = urllib.request.Request(url)

    if PERSONA_READ_SECRET:
        request.add_header("Authorization", f"Bearer {PERSONA_READ_SECRET}")

    try:
        with urllib.request.urlopen(request, timeout=5) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (OSError, urllib.error.URLError, json.JSONDecodeError) as error:
        if persona_id != DEFAULT_PERSONA_ID:
            raise RuntimeError(f"Could not load persona `{persona_id}`. {error}") from error
        logger.warning("Could not load persona `%s`; using default. %s", persona_id, error)
        return fallback

    if not isinstance(payload, dict):
        return fallback

    persona = payload.get("persona")
    if not isinstance(persona, dict):
        return fallback

    source_rights_status = persona.get("source_rights_status")
    voice_consent_status = persona.get("voice_consent_status")
    valid_source_rights = source_rights_status in {"authorized", "licensed", "owned"}
    voice_allowed = (
        voice_consent_status == "approved"
        or (voice_consent_status == "not_required" and valid_source_rights)
    )
    voice_id = persona.get("cartesia_voice_id") if voice_allowed else None
    speed = persona.get("tts_speed")
    emotion = persona.get("tts_emotion")
    tts_options: dict[str, Any] = {}

    if isinstance(speed, (int, float)):
        tts_options["speed"] = speed
    if isinstance(emotion, str):
        tts_options["emotion"] = emotion

    return PersonaConfig(
        id=str(persona.get("id") or fallback.id),
        agent_id=AGENT_NAME,
        instructions=str(payload.get("compiled_prompt") or fallback.instructions),
        greeting=str(persona.get("greeting") or fallback.greeting),
        tts_model=str(persona.get("tts_model") or fallback.tts_model),
        tts_voice_id=voice_id if isinstance(voice_id, str) else fallback.tts_voice_id,
        tts_language=str(persona.get("tts_language") or fallback.tts_language),
        tts_options=tts_options,
        requires_cartesia_plugin=isinstance(voice_id, str),
    )


def cartesia_plugin_model(model: str) -> str:
    return model.removeprefix("cartesia/")


def create_tts(persona: PersonaConfig):
    if persona.requires_cartesia_plugin and not CARTESIA_API_KEY:
        raise RuntimeError(
            f"Persona `{persona.id}` uses a private Cartesia voice; set CARTESIA_API_KEY."
        )

    if CARTESIA_API_KEY and persona.tts_voice_id:
        logger.info(
            "Using Cartesia plugin TTS for persona `%s` with voice `%s`.",
            persona.id,
            persona.tts_voice_id,
        )
        return cartesia.TTS(
            api_key=CARTESIA_API_KEY,
            model=cartesia_plugin_model(persona.tts_model),
            language=persona.tts_language,
            voice=persona.tts_voice_id,
            speed=persona.tts_options.get("speed"),
            emotion=persona.tts_options.get("emotion"),
        )

    tts_kwargs: dict[str, Any] = {"model": persona.tts_model}

    if persona.tts_voice_id:
        tts_kwargs["voice"] = persona.tts_voice_id
    if persona.tts_language:
        tts_kwargs["language"] = persona.tts_language
    if persona.tts_options:
        tts_kwargs["extra_kwargs"] = persona.tts_options

    logger.info("Using LiveKit inference TTS for persona `%s`.", persona.id)
    return inference.TTS(**tts_kwargs)


def update_session_tts(session: AgentSession, persona: PersonaConfig) -> None:
    # LiveKit reads the session TTS at speech generation time, but the current
    # SDK does not expose a public setter. Keep this helper isolated so it is
    # easy to replace if the SDK adds one.
    session._tts = create_tts(persona)
    session._tts_error_counts = 0


async def interrupt_active_speech(session: AgentSession) -> None:
    try:
        await session.interrupt(force=True)
    except RuntimeError:
        logger.debug("Skipping persona TTS switch interrupt before session start.")


def create_persona_tts_switch_rpc_handler(session: AgentSession):
    async def switch_persona_tts(data: rtc.RpcInvocationData) -> str:
        try:
            payload = json.loads(data.payload or "{}")
        except json.JSONDecodeError as error:
            raise rtc.RpcError(1400, "Invalid persona switch payload.") from error

        if not isinstance(payload, dict):
            raise rtc.RpcError(1400, "Invalid persona switch payload.")

        persona_id = payload.get("persona_id")
        user_id = payload.get("user_id")

        if not isinstance(persona_id, str) or not persona_id.strip():
            raise rtc.RpcError(1400, "Missing persona_id.")

        persona = fetch_persona_config(
            persona_id,
            user_id if isinstance(user_id, str) else None,
        )
        update_session_tts(session, persona)
        await interrupt_active_speech(session)

        logger.info(
            "portfolio_agent_tts_switched persona_id=%s voice_id=%s model=%s caller=%s",
            persona.id,
            persona.tts_voice_id,
            persona.tts_model,
            data.caller_identity,
        )

        return json.dumps(
            {
                "ok": True,
                "persona_id": persona.id,
                "tts_model": persona.tts_model,
                "tts_voice_id": persona.tts_voice_id,
            }
        )

    return switch_persona_tts


def validate_agent_provider() -> str | None:
    if AGENT_PROVIDER in VALID_AGENT_PROVIDERS:
        return None

    return (
        f"Unsupported LIVEKIT_AGENT_PROVIDER={AGENT_PROVIDER!r}. "
        f"Expected one of: {', '.join(VALID_AGENT_PROVIDERS)}."
    )


def create_agent_session(persona: PersonaConfig) -> AgentSession:
    provider_error = validate_agent_provider()
    if provider_error:
        raise ValueError(provider_error)

    if AGENT_PROVIDER == "openai":
        return AgentSession(
            stt=openai.STT(
                model=OPENAI_STT_MODEL,
                language=STT_LANGUAGE,
            ),
            llm=openai.LLM(
                model=OPENAI_LLM_MODEL,
            ),
            tts=openai.TTS(
                model=OPENAI_TTS_MODEL,
                voice=OPENAI_TTS_VOICE,
                instructions="Speak in a warm, concise, conversational tone.",
            ),
        )

    return AgentSession(
        stt=inference.STT(
            model=STT_MODEL,
            language=STT_LANGUAGE,
        ),
        llm=inference.LLM(
            model=LLM_MODEL,
        ),
        tts=create_tts(persona),
    )


def env_bool(name: str, default: bool) -> bool:
    value = os.getenv(name)

    if value is None:
        return default

    return value.strip().lower() not in {"0", "false", "no", "off"}


def session_recording_options() -> bool | dict[str, bool]:
    if not env_bool(SESSION_RECORDING_ENABLED_ENV, True):
        return False

    return {
        "audio": env_bool(SESSION_RECORD_AUDIO_ENV, True),
        "logs": env_bool(SESSION_RECORD_LOGS_ENV, True),
        "traces": env_bool(SESSION_RECORD_TRACES_ENV, True),
        "transcript": env_bool(SESSION_RECORD_TRANSCRIPT_ENV, True),
    }


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
    required = list(BASE_REQUIRED_ENV_VARS)

    if AGENT_PROVIDER == "openai":
        required.append("OPENAI_API_KEY")
    else:
        required.append("LIVEKIT_AGENT_TTS_VOICE_ID")

    return [key for key in required if not os.getenv(key)]


def print_env_doctor() -> int:
    provider_error = validate_agent_provider()
    missing = missing_required_env()
    print("LiveKit agent environment")
    print(f"  INFISICAL_PROJECT_ID: {'set' if INFISICAL_PROJECT_ID else 'missing'}")
    print(f"  INFISICAL_ENV: {INFISICAL_ENV}")
    print(f"  LIVEKIT_AGENT_NAME: {AGENT_NAME}")
    print(f"  LIVEKIT_AGENT_PROVIDER: {AGENT_PROVIDER}")
    print(f"  LIVEKIT_AGENT_STT_MODEL: {STT_MODEL}")
    print(f"  LIVEKIT_AGENT_STT_LANGUAGE: {STT_LANGUAGE}")
    print(f"  LIVEKIT_AGENT_LLM_MODEL: {LLM_MODEL}")
    print(f"  LIVEKIT_AGENT_TTS_MODEL: {TTS_MODEL}")
    print(f"  LIVEKIT_AGENT_TTS_VOICE_ID: {'set' if TTS_VOICE_ID else 'missing'}")
    print(f"  OPENAI_AGENT_STT_MODEL: {OPENAI_STT_MODEL}")
    print(f"  OPENAI_AGENT_LLM_MODEL: {OPENAI_LLM_MODEL}")
    print(f"  OPENAI_AGENT_TTS_MODEL: {OPENAI_TTS_MODEL}")
    print(f"  OPENAI_AGENT_TTS_VOICE: {OPENAI_TTS_VOICE}")
    print(f"  OPENAI_API_KEY: {'set' if os.getenv('OPENAI_API_KEY') else 'missing'}")
    print(
        "  LIVEKIT_AGENT_SESSION_RECORDING_ENABLED: "
        f"{env_bool(SESSION_RECORDING_ENABLED_ENV, True)}"
    )
    print(f"  LIVEKIT_AGENT_RECORD_AUDIO: {env_bool(SESSION_RECORD_AUDIO_ENV, True)}")
    print(f"  LIVEKIT_AGENT_RECORD_LOGS: {env_bool(SESSION_RECORD_LOGS_ENV, True)}")
    print(f"  LIVEKIT_AGENT_RECORD_TRACES: {env_bool(SESSION_RECORD_TRACES_ENV, True)}")
    print(
        "  LIVEKIT_AGENT_RECORD_TRANSCRIPT: "
        f"{env_bool(SESSION_RECORD_TRANSCRIPT_ENV, True)}"
    )
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

    for key in (*BASE_REQUIRED_ENV_VARS, "LIVEKIT_AGENT_TTS_VOICE_ID"):
        print(f"  {key}: {'set' if os.getenv(key) else 'missing'}")

    if provider_error:
        print()
        print(provider_error)
        return 1

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
        "--env",
        INFISICAL_ENV,
    ]
    if INFISICAL_PROJECT_ID:
        command.extend(["--projectId", INFISICAL_PROJECT_ID])
    command.extend(["--", sys.executable, *sys.argv])
    env = {
        **os.environ,
        INFISICAL_BOOTSTRAPPED: "1",
        "INFISICAL_ENV": INFISICAL_ENV,
    }
    if INFISICAL_PROJECT_ID:
        env["INFISICAL_PROJECT_ID"] = INFISICAL_PROJECT_ID

    completed = subprocess.run(command, env=env, check=False)
    raise SystemExit(completed.returncode)


async def entrypoint(ctx: JobContext) -> None:
    await ctx.connect()
    metadata = get_job_metadata(ctx)
    persona_id = str(metadata.get("persona_id") or DEFAULT_PERSONA_ID)
    user_id = metadata.get("user_id")
    persona = fetch_persona_config(
        persona_id,
        user_id if isinstance(user_id, str) else None,
    )

    logger.info(
        "portfolio_agent_job_connected agent_name=%s persona_id=%s room=%s job_id=%s",
        AGENT_NAME,
        persona.id,
        ctx.room.name,
        getattr(ctx.job, "id", "unknown"),
    )

    session = create_agent_session(persona)

    register_session_observability(session)
    ctx.room.local_participant.register_rpc_method(
        PERSONA_TTS_SWITCH_RPC_METHOD,
        create_persona_tts_switch_rpc_handler(session),
    )

    await session.start(
        room=ctx.room,
        agent=PortfolioAgent(
            agent_id=persona.agent_id,
            instructions=persona.instructions,
        ),
        record=session_recording_options(),
    )

    logger.info(
        "portfolio_agent_session_started agent_name=%s persona_id=%s room=%s provider=%s llm_model=%s",
        AGENT_NAME,
        persona.id,
        ctx.room.name,
        AGENT_PROVIDER,
        OPENAI_LLM_MODEL if AGENT_PROVIDER == "openai" else LLM_MODEL,
    )

    await session.generate_reply(instructions=persona.greeting)


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
