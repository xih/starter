from __future__ import annotations

import asyncio
from dataclasses import dataclass
import json
import os
from pathlib import Path
from statistics import median
import time
from typing import Any

from web_search import (
    create_default_http_client,
    create_search_provider,
    load_web_search_settings,
)
from web_search_constants import (
    DEFAULT_WEB_SEARCH_BENCHMARK_OUTPUT,
    ESTIMATED_PROVIDER_COSTS,
    SUPPORTED_WEB_SEARCH_PROVIDERS,
    WEB_SEARCH_BENCHMARK_OUTPUT_ENV,
    WEB_SEARCH_PROVIDER_ENV,
)


@dataclass(frozen=True)
class BenchmarkQuery:
    query_id: str
    query: str


@dataclass(frozen=True)
class BenchmarkRun:
    provider: str
    query_id: str
    latency_ms: int
    estimated_cost_usd: float
    result_count: int
    urls_count: int
    dated_results_count: int
    snippet_chars: int
    http_status: int | None
    error: str | None
    raw_sample: dict[str, Any] | None = None


DEFAULT_QUERIES = [
    BenchmarkQuery(
        "provider-pricing",
        "Current API pricing for Exa Parallel Perplexity Search APIs",
    ),
    BenchmarkQuery(
        "livekit-tools",
        "Latest LiveKit Agents Python function_tool documentation",
    ),
    BenchmarkQuery("nextjs-release", "Current latest Next.js release version and date"),
]


def _summarize_provider(runs: list[BenchmarkRun]) -> dict[str, Any]:
    total_cost = sum(run.estimated_cost_usd for run in runs)
    total_runs = len(runs)

    return {
        "runs": total_runs,
        "median_latency_ms": median(run.latency_ms for run in runs),
        "estimated_cost_per_1k_usd": round((total_cost / total_runs) * 1000, 6),
        "result_count": sum(run.result_count for run in runs),
        "citation_count": sum(run.urls_count for run in runs),
        "freshness_signal_count": sum(run.dated_results_count for run in runs),
        "snippet_chars": sum(run.snippet_chars for run in runs),
        "errors": [run.error for run in runs if run.error],
        "status_codes": [
            run.http_status for run in runs if run.http_status is not None
        ],
    }


def build_benchmark_report(runs: list[BenchmarkRun]) -> dict[str, Any]:
    providers = sorted({run.provider for run in runs})
    return {
        "providers": {
            provider: _summarize_provider(
                [run for run in runs if run.provider == provider]
            )
            for provider in providers
        }
    }


def write_benchmark_report(path: Path, runs: list[BenchmarkRun]) -> None:
    path.write_text(json.dumps(build_benchmark_report(runs), indent=2) + "\n")


async def _run_provider_benchmark_async(
    *,
    provider: Any,
    queries: list[BenchmarkQuery],
    max_results: int,
    timeout_seconds: float,
    estimated_cost_per_request: float,
) -> list[BenchmarkRun]:
    runs: list[BenchmarkRun] = []
    for benchmark_query in queries:
        started = time.perf_counter()
        try:
            results = await provider.search(
                query=benchmark_query.query,
                max_results=max_results,
                timeout_seconds=timeout_seconds,
            )
            latency_ms = round((time.perf_counter() - started) * 1000)
            runs.append(
                BenchmarkRun(
                    provider=provider.name,
                    query_id=benchmark_query.query_id,
                    latency_ms=latency_ms,
                    estimated_cost_usd=estimated_cost_per_request,
                    result_count=len(results),
                    urls_count=sum(1 for result in results if result.url),
                    dated_results_count=sum(
                        1 for result in results if result.published_at
                    ),
                    snippet_chars=sum(len(result.snippet) for result in results),
                    http_status=200,
                    error=None,
                    raw_sample=None,
                )
            )
        except Exception as error:
            latency_ms = round((time.perf_counter() - started) * 1000)
            runs.append(
                BenchmarkRun(
                    provider=provider.name,
                    query_id=benchmark_query.query_id,
                    latency_ms=latency_ms,
                    estimated_cost_usd=estimated_cost_per_request,
                    result_count=0,
                    urls_count=0,
                    dated_results_count=0,
                    snippet_chars=0,
                    http_status=None,
                    error=str(error),
                    raw_sample=None,
                )
            )
    return runs


def run_provider_benchmark(
    *,
    provider: Any,
    queries: list[BenchmarkQuery],
    max_results: int,
    timeout_seconds: float,
    estimated_cost_per_request: float,
) -> list[BenchmarkRun]:
    return asyncio.run(
        _run_provider_benchmark_async(
            provider=provider,
            queries=queries,
            max_results=max_results,
            timeout_seconds=timeout_seconds,
            estimated_cost_per_request=estimated_cost_per_request,
        )
    )


async def run_configured_benchmark(
    env: dict[str, str] | None = None,
) -> list[BenchmarkRun]:
    source_env = env if env is not None else os.environ
    runs: list[BenchmarkRun] = []

    async with create_default_http_client() as http_client:
        for provider_name in SUPPORTED_WEB_SEARCH_PROVIDERS:
            provider_env = {**source_env, WEB_SEARCH_PROVIDER_ENV: provider_name}
            try:
                settings = load_web_search_settings(provider_env)
                provider = create_search_provider(settings, http_client=http_client)
                runs.extend(
                    await _run_provider_benchmark_async(
                        provider=provider,
                        queries=DEFAULT_QUERIES,
                        max_results=settings.max_results,
                        timeout_seconds=settings.timeout_seconds,
                        estimated_cost_per_request=ESTIMATED_PROVIDER_COSTS[
                            provider_name
                        ],
                    )
                )
            except Exception as error:
                runs.append(
                    BenchmarkRun(
                        provider=provider_name,
                        query_id="configuration",
                        latency_ms=0,
                        estimated_cost_usd=0,
                        result_count=0,
                        urls_count=0,
                        dated_results_count=0,
                        snippet_chars=0,
                        http_status=None,
                        error=str(error),
                        raw_sample=None,
                    )
                )
    return runs


async def main() -> None:
    output_path = Path(
        os.getenv(
            WEB_SEARCH_BENCHMARK_OUTPUT_ENV,
            DEFAULT_WEB_SEARCH_BENCHMARK_OUTPUT,
        )
    )
    runs = await run_configured_benchmark()
    write_benchmark_report(output_path, runs)
    print(f"Wrote web search benchmark report to {output_path}")


if __name__ == "__main__":
    asyncio.run(main())
