"""Evaluation utilities for AuctionMind prediction outputs."""

import numpy as np
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score


class ModelEvaluator:
    @staticmethod
    def compute_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> dict:
        y_true = np.asarray(y_true, dtype=float)
        y_pred = np.asarray(y_pred, dtype=float)
        
        # Raw metrics
        mae = mean_absolute_error(y_true, y_pred)
        rmse = np.sqrt(mean_squared_error(y_true, y_pred))
        mask = y_true != 0
        mape = np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100 if np.any(mask) else 0.0
        r2 = r2_score(y_true, y_pred)

        # Log metrics
        log_true = np.log1p(y_true)
        log_pred = np.log1p(y_pred)
        log_rmse = np.sqrt(mean_squared_error(log_true, log_pred))
        log_r2 = r2_score(log_true, log_pred)
        
        log_mask = log_true != 0
        log_mape = np.mean(np.abs((log_true[log_mask] - log_pred[log_mask]) / log_true[log_mask])) * 100 if np.any(log_mask) else 0.0

        return {
            "Log-MAPE": log_mape,
            "Log-RMSE": log_rmse,
            "Log-R2": log_r2,
            "Raw MAE": mae,
            "Raw RMSE": rmse,
            "Raw MAPE": mape,
            "Raw R2": r2,
        }

    @staticmethod
    def print_report(metrics: dict, label: str = "Model") -> None:
        print(f"\n{'=' * 50}")
        print(f" {label}")
        print(f"{'=' * 50}")
        print(f"  Log-MAPE : {metrics['Log-MAPE']:>9.2f}%")
        print(f"  Log-RMSE : {metrics['Log-RMSE']:>9.4f}")
        print(f"  Log-R²   : {metrics['Log-R2']:>9.4f}")
        print(f"  Raw MAE  : ${metrics['Raw MAE']:>10.2f}")
        print(f"  Raw MAPE : {metrics['Raw MAPE']:>9.2f}%")
        print(f"  Raw R²   : {metrics['Raw R2']:>9.4f}")
        print(f"{'=' * 50}\n")
