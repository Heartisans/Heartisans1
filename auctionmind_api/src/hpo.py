"""Optuna HPO scaffold for dual-model Tree ensemble."""

import logging
import numpy as np

try:
    import optuna  # type: ignore
    from optuna.pruners import MedianPruner
except ImportError:  # pragma: no cover - optional dependency
    optuna = None

from src.price_predictor import PricePredictor
from src.evaluator import ModelEvaluator

logger = logging.getLogger(__name__)


class HPOptimizer:
    """Optuna-based tuning scaffold for CatBoost + XGBoost Ensemble."""

    def __init__(self, X_train, y_train_log, X_val, y_val_log, y_val_raw, n_trials: int = 50):
        """
        Args:
            X_train: Augmented embeddings for training
            y_train_log: True log prices for training
            X_val: Augmented embeddings for validation
            y_val_log: True log prices for validation
            y_val_raw: True raw prices for validation (used for MAPE evaluation)
            n_trials: Number of Optuna trials
        """
        self.X_train = X_train
        self.y_train_log = y_train_log
        self.X_val = X_val
        self.y_val_log = y_val_log
        self.y_val_raw = y_val_raw
        self.n_trials = n_trials

    def run_study(self) -> dict:
        if optuna is None:
            logger.warning("Optuna not installed; returning placeholder params")
            return {"cat_iterations": 265, "cat_depth": 6, "cat_lr": 0.05}

        def objective(trial):
            # 1. Suggest hyperparameters
            cat_iterations = trial.suggest_int("cat_iterations", 100, 1000, step=50)
            cat_depth = trial.suggest_int("cat_depth", 4, 10)
            cat_lr = trial.suggest_float("cat_lr", 0.01, 0.2, log=True)
            cat_l2 = trial.suggest_float("cat_l2", 1e-3, 10.0, log=True)
            
            xgb_max_depth = trial.suggest_int("xgb_max_depth", 3, 8)
            xgb_lr = trial.suggest_float("xgb_lr", 0.01, 0.2, log=True)
            
            # Blend weight: What % of the final prediction comes from CatBoost (Base) vs XGBoost (Ceiling)
            # e.g., 0.65 means 65% CatBoost, 35% XGBoost
            base_weight = trial.suggest_float("base_weight", 0.4, 0.9)

            # 2. Train PricePredictor with suggested params
            predictor = PricePredictor(checkpoint_dir="checkpoints/hpo_temp")
            
            from catboost import CatBoostRegressor
            from xgboost import XGBRegressor
            
            # Override CatBoost params
            predictor.base_model = CatBoostRegressor(
                iterations=cat_iterations,
                depth=cat_depth,
                learning_rate=cat_lr,
                l2_leaf_reg=cat_l2,
                loss_function='RMSE',
                verbose=False
            )
            
            # Override XGBoost params
            predictor.ceiling_model = XGBRegressor(
                max_depth=xgb_max_depth,
                learning_rate=xgb_lr,
                n_estimators=cat_iterations // 2, # rough heuristic
                objective='reg:quantileerror',
                quantile_alpha=0.90,
                verbosity=0
            )

            try:
                # Train the models (no saving to disk during HPO)
                predictor.base_model.fit(
                    self.X_train, self.y_train_log,
                    eval_set=(self.X_val, self.y_val_log),
                    early_stopping_rounds=50,
                    verbose=False
                )
                
                predictor.ceiling_model.fit(
                    self.X_train, self.y_train_log,
                    eval_set=[(self.X_val, self.y_val_log)],
                    verbose=False
                )
                
                # 3. Evaluate Ensemble
                base_log = predictor.base_model.predict(self.X_val)
                ceiling_log = predictor.ceiling_model.predict(self.X_val)
                
                blended_log = (base_weight * base_log) + ((1.0 - base_weight) * ceiling_log)
                pred_prices = np.expm1(blended_log)
                
                # We want to minimize Log-MAPE because raw MAPE is too skewed by outliers
                # Log-MAPE = mean(abs((true_log - pred_log) / true_log))
                log_mape = np.mean(np.abs((self.y_val_log - blended_log) / self.y_val_log)) * 100.0
                
                return log_mape
                
            except Exception as e:
                # If XGBoost/CatBoost crashes due to memory or bad params, prune the trial
                logger.warning(f"Trial failed with exception: {e}")
                raise optuna.TrialPruned()

        # Run the study
        study = optuna.create_study(
            direction="minimize",
            pruner=MedianPruner(n_warmup_steps=5)
        )
        logger.info(f"Starting Optuna HPO study for {self.n_trials} trials...")
        study.optimize(objective, n_trials=self.n_trials, show_progress_bar=True)
        
        logger.info("HPO Study Complete!")
        logger.info(f"Best Trial: #{study.best_trial.number}")
        logger.info(f"Best Log-MAPE: {study.best_value:.2f}%")
        logger.info("Best Parameters:")
        for key, value in study.best_params.items():
            logger.info(f"  {key}: {value}")
            
        return dict(study.best_params)
