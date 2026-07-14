"""
AuctionMind Multimodal Model
Production-grade orchestration of TextEncoder, TabularEncoder, VisionEncoder, and AttentionFusionMLP
"""

import logging
import torch
import torch.nn as nn
from pathlib import Path
from typing import Dict, List, Tuple, Optional
from src.text_encoder import TextEncoder
from src.tabular_encoder import TabularEncoder
from src.vision_encoder import VisionEncoder
from src.fusion import AttentionFusionMLP
from src.config import FusionConfig
from src.device_utils import get_optimal_device, check_cuda_compatibility

logger = logging.getLogger(__name__)

class AuctionMindMultimodal(nn.Module):
    """
    Complete model that encapsulates the encoders and cross-attention fusion layers.
    Provides a clean API for training and inference.
    """
    
    def __init__(self, device: str = None):
        """
        Initialize the Multimodal model pipeline.
        
        Args:
            device: 'cuda' or 'cpu'. Auto-detected if None.
        """
        super().__init__()
        
        if device is None:
            self.device = get_optimal_device()
            if self.device == "cuda":
                check_cuda_compatibility()
        else:
            self.device = device
            
        logger.info(f"Initializing AuctionMindMultimodal on device: {self.device}")
        
        # Initialize sub-modules
        self.text_encoder = TextEncoder(device=self.device)
        self.tabular_encoder = None  # Will be fitted later
        self.vision_encoder = VisionEncoder(device=self.device)
        self.fusion_mlp = AttentionFusionMLP().to(self.device)
        
        self.is_fitted = False
        logger.info("AuctionMindMultimodal initialized (tabular encoder not yet fitted)")
        
    def fit_tabular_encoder(self, 
                            df_train, 
                            target, 
                            continuous_cols: List[str], 
                            categorical_cols: List[str],
                            boolean_cols: List[str]):
        """
        Fit the tabular encoder and initialize its MLP on the training data.
        """
        logger.info("Fitting tabular encoder on training data...")
        self.tabular_encoder = TabularEncoder(device=self.device)
        self.tabular_encoder.fit(
            df_train, target,
            continuous_cols=continuous_cols,
            categorical_cols=categorical_cols,
            boolean_cols=boolean_cols
        )
        self.is_fitted = True
        logger.info("Tabular encoder successfully fitted and initialized.")
        
    def forward(self, text: str, tabular_data: dict, image_path: str, log_shapes: bool = False) -> torch.Tensor:
        """Forward pass for a single sample."""
        if not self.is_fitted:
            raise RuntimeError("Model must be fitted (fit_tabular_encoder) before forward pass")
            
        if not text:
            raise ValueError("Input text cannot be empty")
            
        # 1. Text Modality
        text_emb = self.text_encoder.process(text)  # (1, 768)
        
        # 2. Tabular Modality
        tabular_emb = self.tabular_encoder.process(tabular_data)  # (1, 128)
        
        # 3. Vision Modality
        vision_emb = self.vision_encoder.process(image_path) # (1, 512)
        
        if log_shapes:
            logger.debug(f"text_emb shape: {text_emb.shape}")
            logger.debug(f"tabular_emb shape: {tabular_emb.shape}")
            logger.debug(f"vision_emb shape: {vision_emb.shape}")
            
        # 4. Fusion
        fused = self.fusion_mlp(text_emb, tabular_emb, vision_emb)  # (1, 256)
        
        return fused
        
    def forward_batch(self, texts: list, tabular_data_list: list, image_paths: list, log_shapes: bool = False) -> torch.Tensor:
        """Forward pass for a batch of samples."""
        if not self.is_fitted:
            raise RuntimeError("Model must be fitted (fit_tabular_encoder) before batch forward pass")
            
        assert len(texts) == len(tabular_data_list) == len(image_paths), "Batch sizes must match across modalities"
        
        # 1. Text Modality
        text_embs = self.text_encoder.process_batch(texts)  # (B, 768)
        
        # 2. Tabular Modality
        tabular_embs = self.tabular_encoder.process_batch(tabular_data_list)  # (B, 128)
        
        # 3. Vision Modality
        vision_embs = self.vision_encoder.process_batch(image_paths) # (B, 512)
        
        if log_shapes:
            logger.debug(f"text_embs shape: {text_embs.shape}")
            logger.debug(f"tabular_embs shape: {tabular_embs.shape}")
            logger.debug(f"vision_embs shape: {vision_embs.shape}")
            
        # 4. Fusion
        fused = self.fusion_mlp(text_embs, tabular_embs, vision_embs)  # (B, 256)
        
        return fused
        
    def to_device(self, device: str):
        if device == "cuda" and not torch.cuda.is_available():
            logger.warning("CUDA requested but not available. Falling back to CPU.")
            self.device = "cpu"
        else:
            self.device = device
            
        self.text_encoder.device = self.device
        self.text_encoder.model.to(self.device)
        
        if self.tabular_encoder is not None:
            self.tabular_encoder.device = self.device
            self.tabular_encoder.mlp.to(self.device)
            
        self.vision_encoder.device = self.device
        self.vision_encoder.model.to(self.device)
        
        self.fusion_mlp.to(self.device)
        logger.info(f"Model moved to device: {self.device}")
