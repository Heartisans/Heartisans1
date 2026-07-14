"""
Generate and cache 256D multimodal embeddings for placeholder and real datasets.
"""

import logging
from pathlib import Path
from typing import Dict, List

import numpy as np
import torch

logger = logging.getLogger(__name__)


class EmbeddingsGenerator:
    """Generate and cache 256D embeddings for the full dataset."""

    def __init__(self, model, cache_dir: str = "embeddings_cache", batch_size: int = 32):
        self.model = model
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.batch_size = batch_size

    def generate(self, texts: List[str], tabular_data: List[Dict], image_paths: List[str], split_name: str) -> np.ndarray:
        out_path = self.cache_dir / f"{split_name}_embeddings.npy"
        if out_path.exists():
            cached = np.load(out_path)
            if cached.shape[0] == len(texts):
                logger.info("Loading cached embeddings from %s", out_path)
                return cached
            logger.info("Cached embeddings for %s are stale (%d rows, expected %d); rebuilding.", split_name, cached.shape[0], len(texts))
            out_path.unlink()

        self.model.eval()
        all_embeddings = []
        from tqdm import tqdm
        for start in tqdm(range(0, len(texts), self.batch_size), desc=f"Generating {split_name} embeddings"):
            batch_texts = texts[start : start + self.batch_size]
            batch_data = tabular_data[start : start + self.batch_size]
            batch_images = image_paths[start : start + self.batch_size]
            with torch.no_grad():
                emb = self.model.forward_batch(batch_texts, batch_data, batch_images)
            if torch.is_tensor(emb):
                emb = emb.cpu().numpy()
            all_embeddings.append(np.asarray(emb, dtype=np.float32))

        result = np.vstack(all_embeddings)
        np.save(out_path, result)
        logger.info("Saved %d embeddings to %s", result.shape[0], out_path)
        return result
