import json
import unittest
from types import SimpleNamespace
from unittest.mock import Mock, patch

import src.agent as agent


class PersonaAgentTests(unittest.TestCase):
    def test_get_job_metadata_reads_json_from_job(self):
        ctx = SimpleNamespace(
            job=SimpleNamespace(
                metadata=json.dumps(
                    {
                        "persona_id": "wife-e2e",
                        "session_id": "session-123",
                        "user_id": "user-123",
                    }
                )
            )
        )

        self.assertEqual(
            agent.get_job_metadata(ctx),
            {
                "persona_id": "wife-e2e",
                "session_id": "session-123",
                "user_id": "user-123",
            },
        )

    def test_get_job_metadata_falls_back_to_empty_object(self):
        ctx = SimpleNamespace(job=SimpleNamespace(metadata="{not-json"))

        self.assertEqual(agent.get_job_metadata(ctx), {})

    def test_fetch_persona_config_maps_prompt_voice_and_options(self):
        payload = {
            "compiled_prompt": "Persona prompt with memory.",
            "persona": {
                "id": "wife-e2e",
                "greeting": "Say hello as this persona.",
                "tts_model": "cartesia/sonic-3.5",
                "cartesia_voice_id": "voice-123",
                "tts_language": "en",
                "tts_speed": 1.2,
                "tts_emotion": "positivity",
            },
        }
        response = Mock()
        response.__enter__ = Mock(return_value=response)
        response.__exit__ = Mock(return_value=None)
        response.read.return_value = json.dumps(payload).encode("utf-8")

        with (
            patch.object(agent, "PERSONA_BASE_URL", "http://localhost:3000"),
            patch.object(agent, "PERSONA_READ_SECRET", "read-secret"),
            patch("src.agent.urllib.request.urlopen", return_value=response) as urlopen,
        ):
            persona = agent.fetch_persona_config("wife-e2e", "user-123")

        request = urlopen.call_args.args[0]
        self.assertEqual(
            request.full_url,
            "http://localhost:3000/api/personas/wife-e2e/agent?user_id=user-123",
        )
        self.assertEqual(request.get_header("Authorization"), "Bearer read-secret")
        self.assertEqual(persona.id, "wife-e2e")
        self.assertEqual(persona.instructions, "Persona prompt with memory.")
        self.assertEqual(persona.greeting, "Say hello as this persona.")
        self.assertEqual(persona.tts_voice_id, "voice-123")
        self.assertEqual(persona.tts_options, {"speed": 1.2, "emotion": "positivity"})

    def test_fetch_persona_config_falls_back_on_fetch_failure(self):
        with (
            patch.object(agent, "PERSONA_BASE_URL", "http://localhost:3000"),
            patch("src.agent.urllib.request.urlopen", side_effect=OSError("offline")),
        ):
            persona = agent.fetch_persona_config("wife-e2e", "user-123")

        self.assertEqual(persona.id, agent.DEFAULT_PERSONA_ID)
        self.assertEqual(persona.instructions, agent.DEFAULT_INSTRUCTIONS)

    def test_create_tts_uses_cartesia_plugin_for_custom_voice(self):
        persona = agent.PersonaConfig(
            id="wife-e2e",
            agent_id="agent",
            instructions="Prompt",
            greeting="Hello",
            tts_model="cartesia/sonic-3.5",
            tts_voice_id="voice-123",
            tts_language="en",
            tts_options={"speed": 1.1, "emotion": "positivity"},
        )

        with (
            patch.object(agent, "CARTESIA_API_KEY", "cartesia-key"),
            patch("src.agent.cartesia.TTS") as cartesia_tts,
        ):
            agent.create_tts(persona)

        cartesia_tts.assert_called_once_with(
            api_key="cartesia-key",
            model="sonic-3.5",
            language="en",
            voice="voice-123",
            speed=1.1,
            emotion="positivity",
        )

    def test_create_tts_falls_back_to_livekit_inference(self):
        persona = agent.PersonaConfig(
            id="portfolio-agent",
            agent_id="agent",
            instructions="Prompt",
            greeting="Hello",
            tts_model="cartesia/sonic-3.5",
            tts_voice_id="voice-123",
            tts_language="en",
            tts_options={},
        )

        with (
            patch.object(agent, "CARTESIA_API_KEY", None),
            patch("src.agent.inference.TTS") as inference_tts,
        ):
            agent.create_tts(persona)

        inference_tts.assert_called_once_with(
            model="cartesia/sonic-3.5",
            voice="voice-123",
            language="en",
        )


if __name__ == "__main__":
    unittest.main()
