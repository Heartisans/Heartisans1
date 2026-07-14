"""Lightweight baseline wrappers for development and placeholder testing."""

import numpy as np

from sklearn.linear_model import Ridge


class Baselines:
    """Simple baseline model wrappers for placeholder testing."""

    def _fit_predict(self, X_train, y_train, X_val):
        model = Ridge(alpha=1.0)
        model.fit(X_train, y_train)
        return np.expm1(model.predict(X_val))

    def tabular_only(self, tabular_train, y_train, tabular_val):
        return self._fit_predict(tabular_train, y_train, tabular_val)

    def text_only(self, sbert_train, y_train, sbert_val):
        return self._fit_predict(sbert_train, y_train, sbert_val)

    def clip_sbert_fusion(self, fusion_train, y_train, fusion_val):
        return self._fit_predict(fusion_train, y_train, fusion_val)
