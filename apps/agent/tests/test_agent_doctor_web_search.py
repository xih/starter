from __future__ import annotations

import contextlib
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
            "WEB_SEARCH_PROVIDER": "parallel",
            "PARALLEL_API_KEY": "parallel-super-secret",
            "WEB_SEARCH_MAX_RESULTS": "5",
            "WEB_SEARCH_TIMEOUT_SECONDS": "8",
        }

        with patch.dict(os.environ, env, clear=True):
            import agent

            output = io.StringIO()
            with contextlib.redirect_stdout(output):
                exit_code = agent.print_env_doctor()

        text = output.getvalue()

        self.assertEqual(exit_code, 0)
        self.assertIn("WEB_SEARCH_PROVIDER: parallel", text)
        self.assertIn("PARALLEL_API_KEY: set", text)
        self.assertIn("WEB_SEARCH_MAX_RESULTS: 5", text)
        self.assertIn("WEB_SEARCH_TIMEOUT_SECONDS: 8", text)
        self.assertNotIn("parallel-super-secret", text)


if __name__ == "__main__":
    unittest.main()
