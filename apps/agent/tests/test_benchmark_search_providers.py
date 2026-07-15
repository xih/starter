from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from benchmark_search_providers import (  # noqa: E402
    BenchmarkRun,
    build_benchmark_report,
)


class BenchmarkSearchProvidersTests(unittest.TestCase):
    def test_report_compares_price_latency_quality_and_redacts_secrets(self) -> None:
        report = build_benchmark_report(
            [
                BenchmarkRun(
                    provider="parallel",
                    query_id="pricing",
                    latency_ms=210,
                    estimated_cost_usd=0.001,
                    result_count=5,
                    urls_count=5,
                    dated_results_count=2,
                    snippet_chars=900,
                    http_status=200,
                    error=None,
                    raw_sample={"authorization": "Bearer parallel-secret"},
                ),
                BenchmarkRun(
                    provider="perplexity",
                    query_id="pricing",
                    latency_ms=840,
                    estimated_cost_usd=0.005,
                    result_count=4,
                    urls_count=4,
                    dated_results_count=1,
                    snippet_chars=650,
                    http_status=200,
                    error=None,
                    raw_sample={"api_key": "pplx-secret"},
                ),
            ]
        )

        self.assertEqual(report["providers"]["parallel"]["median_latency_ms"], 210)
        self.assertEqual(
            report["providers"]["parallel"]["estimated_cost_per_1k_usd"],
            1.0,
        )
        self.assertEqual(
            report["providers"]["perplexity"]["estimated_cost_per_1k_usd"],
            5.0,
        )
        self.assertEqual(report["providers"]["parallel"]["freshness_signal_count"], 2)
        self.assertEqual(report["providers"]["parallel"]["citation_count"], 5)
        self.assertNotIn("parallel-secret", repr(report))
        self.assertNotIn("pplx-secret", repr(report))


if __name__ == "__main__":
    unittest.main()
