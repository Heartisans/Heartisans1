"""Placeholder-capable trainer scaffold for the multimodal fusion MLP."""

import logging
from pathlib import Path
from typing import Dict, List

import numpy as np
import torch
import torch.nn as nn
from src.config import FusionConfig

logger = logging.getLogger(__name__)


class MLPTrainer:
    """Minimal training scaffold for the fusion MLP on log-price regression."""

    def __init__(self, lr: float = 3e-4, weight_decay: float = 0.01, epochs: int = 15, checkpoint_dir: str = "checkpoints"):
        self.lr = lr
        self.weight_decay = weight_decay
        self.epochs = epochs
        self.checkpoint_dir = Path(checkpoint_dir)
        self.checkpoint_dir.mkdir(parents=True, exist_ok=True)
        self.train_losses: List[float] = []

    def train(self, model, texts: List[str], tabular_data: List[Dict], image_paths: List[str], log_prices: torch.Tensor) -> None:
        device = model.device
        log_prices = log_prices.to(device).float()

        # Freeze general model but unfreeze fusion_mlp and tabular_encoder.mlp
        for param in model.parameters():
            param.requires_grad = False
        for param in model.fusion_mlp.parameters():
            param.requires_grad = True
        
        if model.tabular_encoder is not None and model.tabular_encoder.mlp is not None:
            for param in model.tabular_encoder.mlp.parameters():
                param.requires_grad = True

        price_head = nn.Linear(FusionConfig.OUTPUT_DIM, 1).to(device)
        params = list(model.fusion_mlp.parameters()) + list(price_head.parameters())
        if model.tabular_encoder is not None and model.tabular_encoder.mlp is not None:
            params += list(model.tabular_encoder.mlp.parameters())

        optimizer = torch.optim.AdamW(params, lr=self.lr, weight_decay=self.weight_decay)
        criterion = nn.MSELoss()

        logger.info("Precomputing text embeddings for MLP training...")
        model.eval()
        with torch.no_grad():
            text_embs = model.text_encoder.process_batch(texts, show_progress_bar=True).to(device)
            
        logger.info("Precomputing vision embeddings for MLP training...")
        with torch.no_grad():
            vision_embs = model.vision_encoder.process_batch(image_paths, show_progress_bar=True).to(device)

        logger.info("Transforming tabular features...")
        tabular_features_list = [model.tabular_encoder.engineer.preprocess(d) for d in tabular_data]
        tabular_features_np = np.array(tabular_features_list, dtype=np.float32)
        tabular_features_tensor = torch.from_numpy(tabular_features_np).to(device)

        logger.info("Precomputation complete. Preparing mini-batches.")
        from torch.utils.data import TensorDataset, DataLoader
        dataset = TensorDataset(text_embs, tabular_features_tensor, vision_embs, log_prices)
        # Use mini-batches of size 128 for training
        dataloader = DataLoader(dataset, batch_size=128, shuffle=True)

        logger.info("Starting Multimodal MLP training with Modality Dropout.")
        model.train()
        if model.tabular_encoder is not None and model.tabular_encoder.mlp is not None:
            model.tabular_encoder.mlp.train()

        for epoch in range(self.epochs):
            epoch_loss = 0.0
            for batch_text, batch_tab, batch_vis, batch_price in dataloader:
                optimizer.zero_grad()
                
                if model.tabular_encoder is not None and model.tabular_encoder.mlp is not None:
                    batch_tab_emb = model.tabular_encoder.mlp(batch_tab)
                else:
                    with torch.no_grad():
                        batch_tab_emb = model.tabular_encoder.mlp(batch_tab)
                        
                # === MODALITY DROPOUT ===
                # We randomly zero out one of the modalities to force the network to be robust
                # against missing data (e.g. missing images or empty descriptions).
                rand_val = torch.rand(1).item()
                if rand_val < 0.15: # 15% chance to drop Text
                    batch_text = torch.zeros_like(batch_text)
                elif rand_val < 0.30: # 15% chance to drop Tabular
                    batch_tab_emb = torch.zeros_like(batch_tab_emb)
                elif rand_val < 0.45: # 15% chance to drop Vision
                    batch_vis = torch.zeros_like(batch_vis)

                # Forward pass through Cross-Attention Fusion
                embeddings = model.fusion_mlp(batch_text, batch_tab_emb, batch_vis)
                preds = price_head(embeddings).squeeze(-1)
                
                loss = criterion(preds, batch_price)
                loss.backward()
                optimizer.step()
                epoch_loss += loss.item() * batch_text.size(0)

            epoch_loss /= len(dataset)
            if (epoch + 1) % 5 == 0 or epoch == 0 or epoch == self.epochs - 1:
                logger.info("Epoch %d/%d -> Loss: %.6f", epoch + 1, self.epochs, epoch_loss)

        for param in model.fusion_mlp.parameters():
            param.requires_grad = False
        if model.tabular_encoder is not None and model.tabular_encoder.mlp is not None:
            for param in model.tabular_encoder.mlp.parameters():
                param.requires_grad = False

        save_path = self.checkpoint_dir / "fusion_mlp_trained.pt"
        checkpoint = {
            "fusion_mlp": model.fusion_mlp.state_dict(),
            "tabular_mlp": model.tabular_encoder.mlp.state_dict() if model.tabular_encoder is not None and model.tabular_encoder.mlp is not None else None
        }
        torch.save(checkpoint, save_path)
        logger.info("Saved trained Multimodal checkpoints to %s", save_path)


    def load_trained_fusion(self, model, path: str = None):
        p = path or str(self.checkpoint_dir / "fusion_mlp_trained.pt")
        checkpoint = torch.load(p, map_location=model.device)
        
        if isinstance(checkpoint, dict) and "fusion_mlp" in checkpoint:
            model.fusion_mlp.load_state_dict(checkpoint["fusion_mlp"])
            if model.tabular_encoder is not None and model.tabular_encoder.mlp is not None and checkpoint.get("tabular_mlp") is not None:
                model.tabular_encoder.mlp.load_state_dict(checkpoint["tabular_mlp"])
                for param in model.tabular_encoder.mlp.parameters():
                    param.requires_grad = False
        else:
            # Backwards compatibility fallback
            model.fusion_mlp.load_state_dict(checkpoint)

        for param in model.fusion_mlp.parameters():
            param.requires_grad = False
        logger.info("Loaded trained multimodal fusion MLP weights from %s", p)
