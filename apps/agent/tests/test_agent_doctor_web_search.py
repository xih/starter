from __future__ import annotations

import contextlib
import importlib
import io
import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))


class AgentDoctorWebSearchTests(unittest.TestCase):
    def test_doctor_reports_web_search_config_without_secret_values(self) -> None:
        env = {
            "LIVEKIT_URL": "wss://voice.example.livekit.cloud",
            "LIVEKIT_API_KEY": "livekit-key",
            "LIVEKIT_API_SECRET": "livekit-secret",
            "LIVEKIT_AGENT_TTS_VOICE_ID": "voice-id",
            "CARTESIA_API_KEY": "cartesia-super-secret",
            "OPENAI_API_KEY": "openai-super-secret",
            "LIVEKIT_AGENT_PERSONA_BASE_URL": "https://portfolio.example",
            "PERSONA_AGENT_READ_SECRET": "persona-super-secret",
            "WEB_SEARCH_PROVIDER": "parallel",
            "PARALLEL_API_KEY": "parallel-super-secret",
            "WEB_SEARCH_MAX_RESULTS": "5",
            "WEB_SEARCH_TIMEOUT_SECONDS": "8",
        }

        with patch.dict(os.environ, env, clear=True):
            import agent

            agent = importlib.reload(agent)
            output = io.StringIO()
            with contextlib.redirect_stdout(output):
                exit_code = agent.print_env_doctor()

        text = output.getvalue()

        self.assertEqual(exit_code, 0)
        self.assertIn("LIVEKIT_AGENT_PROVIDER: livekit", text)
        self.assertIn("OPENAI_API_KEY: set", text)
        self.assertIn("WEB_SEARCH_PROVIDER: parallel", text)
        self.assertIn("PARALLEL_API_KEY: set", text)
        self.assertIn("WEB_SEARCH_MAX_RESULTS: 5", text)
        self.assertIn("WEB_SEARCH_TIMEOUT_SECONDS: 8", text)
        self.assertNotIn("parallel-super-secret", text)
        self.assertNotIn("openai-super-secret", text)

    def test_doctor_can_still_validate_openai_provider(self) -> None:
        env = {
            "LIVEKIT_URL": "wss://voice.example.livekit.cloud",
            "LIVEKIT_API_KEY": "livekit-key",
            "LIVEKIT_API_SECRET": "livekit-secret",
            "LIVEKIT_AGENT_TTS_VOICE_ID": "voice-id",
            "LIVEKIT_AGENT_PROVIDER": "openai",
            "CARTESIA_API_KEY": "cartesia-super-secret",
            "OPENAI_API_KEY": "openai-super-secret",
            "LIVEKIT_AGENT_PERSONA_BASE_URL": "https://portfolio.example",
            "PERSONA_AGENT_READ_SECRET": "persona-super-secret",
        }

        with patch.dict(os.environ, env, clear=True):
            import agent

            agent = importlib.reload(agent)
            output = io.StringIO()
            with contextlib.redirect_stdout(output):
                exit_code = agent.print_env_doctor()

        text = output.getvalue()

        self.assertEqual(exit_code, 0)
        self.assertIn("LIVEKIT_AGENT_PROVIDER: openai", text)
        self.assertIn("OPENAI_AGENT_STT_MODEL: whisper-1", text)
        self.assertIn("OPENAI_AGENT_LLM_MODEL: gpt-4o-mini", text)
        self.assertIn("OPENAI_AGENT_TTS_MODEL: tts-1", text)
        self.assertIn("OPENAI_AGENT_TTS_VOICE: alloy", text)
        self.assertIn("OPENAI_API_KEY: set", text)

    def test_doctor_rejects_unknown_agent_provider(self) -> None:
        env = {
            "LIVEKIT_URL": "wss://voice.example.livekit.cloud",
            "LIVEKIT_API_KEY": "livekit-key",
            "LIVEKIT_API_SECRET": "livekit-secret",
            "LIVEKIT_AGENT_PROVIDER": "livkit",
        }

        with patch.dict(os.environ, env, clear=True):
            import agent

            agent = importlib.reload(agent)
            output = io.StringIO()
            with contextlib.redirect_stdout(output):
                exit_code = agent.print_env_doctor()

        text = output.getvalue()

        self.assertEqual(exit_code, 1)
        self.assertIn("Unsupported LIVEKIT_AGENT_PROVIDER='livkit'", text)
        self.assertIn("Expected one of: openai, livekit", text)


if __name__ == "__main__":
    unittest.main()
