from __future__ import annotations

import unittest
from pathlib import Path


AGENT_DIR = Path(__file__).resolve().parents[1]


class AgentDocsEnvTests(unittest.TestCase):
    def test_env_example_documents_web_search_configuration(self) -> None:
        env_example = (AGENT_DIR / ".env.example").read_text()

        for key in [
            "WEB_SEARCH_PROVIDER=parallel",
            "WEB_SEARCH_MAX_RESULTS=5",
            "WEB_SEARCH_TIMEOUT_SECONDS=8",
            "PARALLEL_API_KEY=",
            "EXA_API_KEY=",
            "PERPLEXITY_API_KEY=",
        ]:
            self.assertIn(key, env_example)

    def test_readme_documents_infisical_provider_keys_and_benchmark(self) -> None:
        readme = (AGENT_DIR / "README.md").read_text()

        self.assertIn("PARALLEL_API_KEY", readme)
        self.assertIn("EXA_API_KEY", readme)
        self.assertIn("PERPLEXITY_API_KEY", readme)
        self.assertIn("benchmark_search_providers", readme)
