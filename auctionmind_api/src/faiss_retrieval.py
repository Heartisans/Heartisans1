"""
FAISS-style retrieval utilities with a NumPy fallback for environments without faiss.
"""

import logging
from pathlib import Path
from typing import Optional

import numpy as np

try:
    import faiss  # type: ignore
except ImportError:  # pragma: no cover - optional dependency
    faiss = None

logger = logging.getLogger(__name__)


class FAISSRetriever:
    """Build and query a nearest-neighbour index over 256D embeddings."""

    def __init__(self, embedding_dim: int = 256, k: int = 10):
        self.embedding_dim = embedding_dim
        self.k = k
        self.index = None
        self.prices = None
        self.log_prices = None

    def build(self, embeddings: np.ndarray, prices: np.ndarray, log_prices: np.ndarray) -> None:
        if embeddings.shape[1] != self.embedding_dim:
            raise ValueError(f"Expected embeddings of shape (N, {self.embedding_dim}), got {embeddings.shape}")

        if faiss is not None:
            norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
            normed = (embeddings / norms).astype("float32")
            self.index = faiss.IndexFlatIP(self.embedding_dim)
            self.index.add(normed)
        else:
            self.index = {"embeddings": embeddings.astype("float32"), "norms": np.linalg.norm(embeddings, axis=1)}

        self.prices = prices.astype("float32")
        self.log_prices = log_prices.astype("float32")
        logger.info("FAISS index built with %d vectors", len(embeddings))

    def save(self, directory: str = "checkpoints") -> None:
        d = Path(directory)
        d.mkdir(parents=True, exist_ok=True)
        if faiss is not None and self.index is not None:
            faiss.write_index(self.index, str(d / "faiss.index"))
        else:
            np.save(d / "faiss_fallback_embeddings.npy", self.index["embeddings"])
            np.save(d / "faiss_fallback_norms.npy", self.index["norms"])
        np.save(d / "faiss_prices.npy", self.prices)
        np.save(d / "faiss_log_prices.npy", self.log_prices)

    def load(self, directory: str = "checkpoints") -> None:
        d = Path(directory)
        if faiss is not None and (d / "faiss.index").exists():
            self.index = faiss.read_index(str(d / "faiss.index"))
        else:
            self.index = {
                "embeddings": np.load(d / "faiss_fallback_embeddings.npy"),
                "norms": np.load(d / "faiss_fallback_norms.npy"),
            }
        self.prices = np.load(d / "faiss_prices.npy")
        self.log_prices = np.load(d / "faiss_log_prices.npy")

    def retrieve(self, query: np.ndarray, exclude_idx: Optional[int] = None) -> dict:
        if faiss is not None and self.index is not None:
            q = query / np.linalg.norm(query)
            search_k = self.k + 1 if exclude_idx is not None else self.k
            sims, idxs = self.index.search(q.astype("float32").reshape(1, -1), search_k)
            sims = sims[0]
            idxs = idxs[0]
            if exclude_idx is not None:
                mask = idxs != exclude_idx
                sims = sims[mask][:self.k]
                idxs = idxs[mask][:self.k]
            comp_log = self.log_prices[idxs]
            return {
                "mean_log": float(comp_log.mean()) if len(comp_log) > 0 else 0.0,
                "min_log": float(comp_log.min()) if len(comp_log) > 0 else 0.0,
                "max_log": float(comp_log.max()) if len(comp_log) > 0 else 0.0,
                "std_log": float(comp_log.std()) if len(comp_log) > 0 else 0.0,
                "mean_sim": float(sims.mean()) if len(sims) > 0 else 0.0,
            }

        embeddings = self.index["embeddings"]
        norm = np.linalg.norm(query)
        if np.isclose(norm, 0):
            norm = 1.0
        q = query.astype("float32") / norm
        sims = embeddings @ q
        search_k = self.k + 1 if exclude_idx is not None else self.k
        order = np.argsort(-sims)[:search_k]
        if exclude_idx is not None:
            mask = order != exclude_idx
            order = order[mask][:self.k]
        comp_log = self.log_prices[order]
        return {
            "mean_log": float(comp_log.mean()) if len(comp_log) > 0 else 0.0,
            "min_log": float(comp_log.min()) if len(comp_log) > 0 else 0.0,
            "max_log": float(comp_log.max()) if len(comp_log) > 0 else 0.0,
            "std_log": float(comp_log.std()) if len(comp_log) > 0 else 0.0,
            "mean_sim": float(sims[order].mean()) if len(order) > 0 else 0.0,
        }

    def augment(self, embeddings: np.ndarray, is_training: bool = False) -> np.ndarray:
        augmented = []
        for idx, emb in enumerate(embeddings):
            stats = self.retrieve(emb, exclude_idx=idx if is_training else None)
            extra = np.array([stats["mean_log"], stats["min_log"], stats["max_log"], stats["std_log"], stats["mean_sim"]], dtype="float32")
            augmented.append(np.concatenate([emb.astype("float32"), extra]))
        return np.asarray(augmented, dtype="float32")
