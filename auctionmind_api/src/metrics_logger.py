"""
Metrics Logger for AuctionMind Inference Monitoring
Tracks latency, memory usage, and batch sizes for production observability.
Enables detection of performance regressions, OOM issues, and bottlenecks.
"""

import json
import time
import tracemalloc
import functools
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional, Callable

logger = logging.getLogger(__name__)


class MetricsLogger:
    """
    Accumulates inference metrics (latency, memory, batch size) in memory.
    Periodically flushes to disk (JSON format) for analysis.
    
    Usage:
        logger = MetricsLogger(output_file="logs/inference_metrics.json")
        logger.log(batch_size=32, latency_ms=125.5, peak_memory_mb=1024.3)
        logger.log(batch_size=1, latency_ms=3.2, peak_memory_mb=512.1)
        logger.flush()  # Write all buffered records to disk
    
    Output Format (JSON):
    [
        {
            "timestamp": "2026-05-12T14:30:45.123456",
            "batch_size": 32,
            "latency_ms": 125.5,
            "peak_memory_mb": 1024.3
        },
        ...
    ]
    """

    def __init__(self, output_file: str = "logs/inference_metrics.json"):
        """
        Initialize metrics logger.
        
        Args:
            output_file: Path to JSON file where metrics are appended.
                        Parent directories are created if needed.
        """
        self.output_file = Path(output_file)
        self.output_file.parent.mkdir(parents=True, exist_ok=True)
        self.records = []  # In-memory buffer
        logger.info(f"MetricsLogger initialized → {output_file}")

    def log(self, batch_size: int, latency_ms: float, peak_memory_mb: float):
        """
        Record a single inference event.
        
        Args:
            batch_size: Number of samples in batch (1 for single sample)
            latency_ms: Inference time in milliseconds (float)
            peak_memory_mb: Peak memory usage in MB (float)
        """
        record = {
            "timestamp": datetime.now().isoformat(),
            "batch_size": batch_size,
            "latency_ms": round(latency_ms, 3),
            "peak_memory_mb": round(peak_memory_mb, 3),
        }
        self.records.append(record)

    def flush(self):
        """
        Write all buffered records to disk, appending to existing file if present.
        Clears in-memory buffer after flush.
        
        Usage:
            # After inference loop completes
            metrics_logger.flush()
        """
        if not self.records:
            logger.warning("No metrics to flush")
            return

        # Load existing records if file exists
        existing = []
        if self.output_file.exists():
            try:
                with open(self.output_file, "r") as f:
                    existing = json.load(f)
            except (json.JSONDecodeError, IOError) as e:
                logger.warning(f"Could not read existing metrics file: {e}. Starting fresh.")

        # Append new records and write
        with open(self.output_file, "w") as f:
            json.dump(existing + self.records, f, indent=2)

        logger.info(
            f"Flushed {len(self.records)} metrics to {self.output_file} "
            f"(total: {len(existing) + len(self.records)} records)"
        )
        self.records = []


def timed_inference(func: Callable) -> Callable:
    """
    Decorator to measure latency and peak memory for any inference method.
    Automatically logs to self.metrics_logger if present on the object.
    
    Usage:
        In AuctionMindPartial class:
        
        @timed_inference
        def forward(self, text, tabular_data):
            ...
        
        # When called:
        model.forward(text, data)  # Metrics logged automatically
    
    Requires:
        - self.metrics_logger: MetricsLogger instance
        - self.device: torch device (to determine batch size for single samples)
    
    Tracks:
        - Inference latency (ms)
        - Peak memory (MB)
        - Batch size (inferred from args)
    """

    @functools.wraps(func)
    def wrapper(self, *args, **kwargs):
        # Determine batch size from function signature
        batch_size = 1  # default for single sample forward()
        if len(args) > 1:
            # forward_batch(texts, tabular_data_list, ...)
            texts_or_list = args[1]
            if hasattr(texts_or_list, "__len__"):
                batch_size = len(texts_or_list)

        # Measure memory and latency
        tracemalloc.start()
        t0 = time.perf_counter()

        try:
            result = func(self, *args, **kwargs)
        finally:
            latency_ms = (time.perf_counter() - t0) * 1000
            _, peak_bytes = tracemalloc.get_traced_memory()
            tracemalloc.stop()

            peak_memory_mb = peak_bytes / (1024**2)

            # Log if metrics_logger exists
            if hasattr(self, "metrics_logger") and self.metrics_logger:
                self.metrics_logger.log(batch_size, latency_ms, peak_memory_mb)

        return result

    return wrapper


class MetricsAnalyzer:
    """
    Analyzes logged metrics to detect performance issues.
    
    Usage:
        analyzer = MetricsAnalyzer("logs/inference_metrics.json")
        analyzer.print_summary()  # Mean/std/min/max latency
        analyzer.detect_outliers()  # Identify OOM, timeout events
    """

    def __init__(self, metrics_file: str):
        """Load metrics from JSON file."""
        self.file = Path(metrics_file)
        self.records = self._load()

    def _load(self) -> list:
        """Load all metrics from file."""
        if not self.file.exists():
            logger.warning(f"Metrics file not found: {self.file}")
            return []

        try:
            with open(self.file, "r") as f:
                return json.load(f)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to load metrics: {e}")
            return []

    def print_summary(self):
        """Print latency and memory statistics."""
        if not self.records:
            print("No metrics available")
            return

        latencies = [r["latency_ms"] for r in self.records]
        memories = [r["peak_memory_mb"] for r in self.records]

        import statistics

        print("\n" + "=" * 60)
        print("Inference Metrics Summary")
        print("=" * 60)
        print(f"Total inferences: {len(self.records)}")
        print(
            f"Latency (ms): "
            f"mean={statistics.mean(latencies):.2f}, "
            f"std={statistics.stdev(latencies) if len(latencies) > 1 else 0:.2f}, "
            f"min={min(latencies):.2f}, "
            f"max={max(latencies):.2f}"
        )
        print(
            f"Memory (MB): "
            f"mean={statistics.mean(memories):.2f}, "
            f"std={statistics.stdev(memories) if len(memories) > 1 else 0:.2f}, "
            f"min={min(memories):.2f}, "
            f"max={max(memories):.2f}"
        )
        print("=" * 60 + "\n")

    def detect_outliers(self, latency_threshold_ms: float = 1000.0):
        """
        Flag inferences with unusually high latency or memory.
        
        Args:
            latency_threshold_ms: Flag if latency exceeds this (default 1 second)
        """
        outliers = [
            r
            for r in self.records
            if r["latency_ms"] > latency_threshold_ms
        ]

        if outliers:
            print(f"\n⚠️  {len(outliers)} slow inferences detected (> {latency_threshold_ms}ms):")
            for r in outliers[:10]:  # Show first 10
                print(
                    f"  {r['timestamp']}: batch={r['batch_size']}, "
                    f"latency={r['latency_ms']:.1f}ms, mem={r['peak_memory_mb']:.1f}MB"
                )
        else:
            print(f"✓ No slow inferences (all ≤ {latency_threshold_ms}ms)")
