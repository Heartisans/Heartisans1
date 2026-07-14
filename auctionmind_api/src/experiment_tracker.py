"""Lightweight experiment tracking scaffold with optional MLflow support."""

import json
import logging
from pathlib import Path
from typing import Any, Dict

try:
    import mlflow  # type: ignore
except ImportError:  # pragma: no cover - optional dependency
    mlflow = None

logger = logging.getLogger(__name__)


class ExperimentTracker:
    """Track experiments locally or through MLflow when available."""

    def __init__(self, experiment_name: str = "auctionmind", tracking_uri: str = "mlruns"):
        self.experiment_name = experiment_name
        self.tracking_uri = Path(tracking_uri)
        self.tracking_uri.mkdir(parents=True, exist_ok=True)
        self.run = None
        self._fallback_log = self.tracking_uri / "experiment_log.jsonl"

        if mlflow is not None:
            mlflow.set_tracking_uri(str(self.tracking_uri))
            mlflow.set_experiment(experiment_name)

    def start_run(self, run_name: str):
        if mlflow is not None:
            self.run = mlflow.start_run(run_name=run_name)
        else:
            self.run = {"name": run_name}
        logger.info("Experiment run started: %s", run_name)

    def log_params(self, params: Dict[str, Any]):
        if mlflow is not None:
            mlflow.log_params(params)
        else:
            with open(self._fallback_log, "a", encoding="utf-8") as fh:
                fh.write(json.dumps({"event": "params", "params": params}) + "\n")

    def log_metrics(self, metrics: Dict[str, float], step: int = None):
        if mlflow is not None:
            mlflow.log_metrics(metrics, step=step)
        else:
            with open(self._fallback_log, "a", encoding="utf-8") as fh:
                fh.write(json.dumps({"event": "metrics", "metrics": metrics, "step": step}) + "\n")

    def log_artifact(self, filepath: str):
        if mlflow is not None:
            mlflow.log_artifact(filepath)

    def log_model(self, model, artifact_path: str = "fusion_mlp"):
        if mlflow is not None:
            mlflow.pytorch.log_model(model, artifact_path)

    def end_run(self):
        if mlflow is not None and self.run is not None:
            mlflow.end_run()
        logger.info("Experiment run ended.")
