from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from benchmark_search_providers import (  # noqa: E402
    BenchmarkQuery,
    BenchmarkRun,
    run_provider_benchmark,
    write_benchmark_report,
)
from web_search import SearchResult  # noqa: E402


class FakeProvider:
    name = "parallel"

    async def search(
        self,
        query: str,
        max_results: int,
        timeout_seconds: float,
    ) -> list[SearchResult]:
        return [
            SearchResult(
                title="Parallel Pricing",
                url="https://parallel.ai/pricing",
                snippet="Search API pricing details.",
                published_at="2026-07-14",
                provider="parallel",
            )
        ]


class BenchmarkCliTests(unittest.TestCase):
    def test_writes_redacted_json_report(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            output_path = Path(temp_dir) / "search-benchmark.json"

            write_benchmark_report(
                output_path,
                [
                    BenchmarkRun(
                        provider="parallel",
                        query_id="pricing",
                        latency_ms=210,
                        estimated_cost_usd=0.001,
                        result_count=5,
                        urls_count=5,
                        dated_results_count=1,
                        snippet_chars=500,
                        http_status=200,
                        error=None,
                        raw_sample={"api_key": "parallel-secret"},
                    )
                ],
            )

            payload = json.loads(output_path.read_text())

        self.assertEqual(
            payload["providers"]["parallel"]["estimated_cost_per_1k_usd"],
            1.0,
        )
        self.assertNotIn("parallel-secret", repr(payload))

    def test_runs_provider_benchmark_with_query_set(self) -> None:
        runs = run_provider_benchmark(
            provider=FakeProvider(),
            queries=[
                BenchmarkQuery(
                    query_id="pricing",
                    query="Parallel Search API pricing",
                )
            ],
            max_results=5,
            timeout_seconds=8,
            estimated_cost_per_request=0.001,
        )

        self.assertEqual(len(runs), 1)
        self.assertEqual(runs[0].provider, "parallel")
        self.assertEqual(runs[0].query_id, "pricing")
        self.assertEqual(runs[0].estimated_cost_usd, 0.001)
        self.assertEqual(runs[0].result_count, 1)
        self.assertEqual(runs[0].urls_count, 1)
        self.assertEqual(runs[0].dated_results_count, 1)
