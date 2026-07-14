"""
Pricing heads for AuctionMind.
The implementation uses CatBoost/XGBoost when available and falls back to lightweight
scikit-learn regressors in placeholder environments.
"""

import logging
from pathlib import Path

import numpy as np

try:
    from catboost import CatBoostRegressor  # type: ignore
except ImportError:  # pragma: no cover - optional dependency
    CatBoostRegressor = None

try:
    from xgboost import XGBRegressor  # type: ignore
except ImportError:  # pragma: no cover - optional dependency
    XGBRegressor = None

from sklearn.ensemble import ExtraTreesRegressor, HistGradientBoostingRegressor, RandomForestRegressor

logger = logging.getLogger(__name__)


class _FallbackRegressor:
    """Robust fallback regressors for noisy real-world pricing signals."""

    def __init__(self, model_name: str = "base"):
        if model_name == "ceiling":
            self.model = ExtraTreesRegressor(n_estimators=200, random_state=42, n_jobs=-1)
        else:
            self.model = HistGradientBoostingRegressor(
                learning_rate=0.05,
                max_depth=6,
                random_state=42,
                loss="squared_error",
            )

    def fit(self, X, y, eval_set=None, verbose=False):
        self.model.fit(X, y)
        return self

    def predict(self, X):
        return self.model.predict(X)

    def save_model(self, path):
        import joblib

        joblib.dump(self.model, path)

    def load_model(self, path):
        import joblib

        self.model = joblib.load(path)


class PricePredictor:
    """Two pricing heads operating on log-price scale."""

    def _build_fallback_model(self, variant: str = "base"):
        if variant == "ceiling":
            return ExtraTreesRegressor(n_estimators=200, random_state=42, n_jobs=-1)
        return HistGradientBoostingRegressor(
            learning_rate=0.05,
            max_depth=6,
            random_state=42,
            loss="squared_error",
        )

    def __init__(self, checkpoint_dir: str = "checkpoints"):
        self.checkpoint_dir = Path(checkpoint_dir)
        self.checkpoint_dir.mkdir(parents=True, exist_ok=True)
        self.base_model = None
        self.ceiling_model = None

    def train_base(self, X_train: np.ndarray, y_train: np.ndarray, X_val: np.ndarray, y_val: np.ndarray):
        if CatBoostRegressor is not None:
            model = CatBoostRegressor(
                iterations=850,
                depth=10,
                learning_rate=0.13692651456290109,
                l2_leaf_reg=0.014964378645391208,
                subsample=0.8,
                colsample_bylevel=0.8,
                min_data_in_leaf=15,
                loss_function="RMSE",
                boosting_type="Ordered",
                od_type="Iter",
                od_wait=150,
                random_seed=42,
                verbose=100
            )
            model.fit(X_train, y_train, eval_set=(X_val, y_val))
        else:
            model = self._build_fallback_model("base")
            model.fit(X_train, y_train)

        self.base_model = model
        if hasattr(model, "save_model"):
            model.save_model(str(self.checkpoint_dir / "catboost_base.cbm"))
        logger.info("Base pricing model trained.")
        return model

    def train_ceiling(self, X_train: np.ndarray, y_train: np.ndarray, X_val: np.ndarray, y_val: np.ndarray, quantile: float = 0.9):
        if XGBRegressor is not None:
            model = XGBRegressor(
                objective="reg:quantileerror",
                quantile_alpha=quantile,
                n_estimators=4000,
                max_depth=8,
                learning_rate=0.11474431592742897,
                subsample=0.8,
                colsample_bytree=0.8,
                early_stopping_rounds=150,
                random_state=42,
                verbosity=1
            )
            model.fit(X_train, y_train, eval_set=[(X_val, y_val)], verbose=100)
        else:
            model = self._build_fallback_model("ceiling")
            model.fit(X_train, y_train)


        self.ceiling_model = model
        if hasattr(model, "save_model"):
            model.save_model(str(self.checkpoint_dir / "xgboost_ceiling.json"))
        logger.info("Ceiling pricing model trained.")
        return model

    def predict(self, X: np.ndarray):
        if self.base_model is None or self.ceiling_model is None:
            raise RuntimeError("Models not trained or loaded. Call train_base()/train_ceiling() first.")

        base_log = self.base_model.predict(X)
        ceiling_log = self.ceiling_model.predict(X)
        return np.expm1(base_log), np.expm1(ceiling_log)

    def load(self):
        if CatBoostRegressor is not None:
            self.base_model = CatBoostRegressor()
            self.base_model.load_model(str(self.checkpoint_dir / "catboost_base.cbm"))
        else:
            self.base_model = _FallbackRegressor()
            self.base_model.load_model(str(self.checkpoint_dir / "catboost_base.cbm"))

        if XGBRegressor is not None:
            self.ceiling_model = XGBRegressor()
            self.ceiling_model.load_model(str(self.checkpoint_dir / "xgboost_ceiling.json"))
        else:
            self.ceiling_model = _FallbackRegressor()
            self.ceiling_model.load_model(str(self.checkpoint_dir / "xgboost_ceiling.json"))
        logger.info("Pricing models loaded from checkpoints.")
