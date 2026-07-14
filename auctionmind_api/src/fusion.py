"""
Multimodal Fusion Layer
Combines text and tabular embeddings into a shared 256-dimensional representation
"""

import torch
import torch.nn as nn
from src.config import FusionConfig


class AttentionFusionMLP(nn.Module):
    """
    Cross-Attention Fusion that dynamically weighs text, tabular, and vision embeddings.
    This replaces the standard FusionMLP to make the architecture highly robust against
    missing or noisy image data (e.g., generic store logos).
    """
    def __init__(
        self,
        text_dim: int = FusionConfig.TEXT_DIM,
        tabular_dim: int = FusionConfig.TABULAR_DIM,
        vision_dim: int = FusionConfig.VISION_DIM,
        output_dim: int = FusionConfig.OUTPUT_DIM,
        dropout: float = FusionConfig.DROPOUT
    ):
        super().__init__()
        
        # We need a common dimension for attention
        self.common_dim = 256
        
        # Project inputs to common dimension
        self.proj_text = nn.Linear(text_dim, self.common_dim)
        self.proj_tab = nn.Linear(tabular_dim, self.common_dim)
        self.proj_vis = nn.Linear(vision_dim, self.common_dim)
        
        # Multi-head attention (self-attention across modalities)
        self.attention = nn.MultiheadAttention(embed_dim=self.common_dim, num_heads=4, batch_first=True, dropout=dropout)
        
        # Final projection MLP
        self.projection = nn.Sequential(
            nn.Linear(self.common_dim * 3, 512),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(512, output_dim),
            nn.BatchNorm1d(output_dim)
        )
        
    def forward(self, text_emb: torch.Tensor, tabular_emb: torch.Tensor, vision_emb: torch.Tensor) -> torch.Tensor:
        # Project to common dim
        t = self.proj_text(text_emb).unsqueeze(1) # (B, 1, 256)
        c = self.proj_tab(tabular_emb).unsqueeze(1) # (B, 1, 256)
        v = self.proj_vis(vision_emb).unsqueeze(1) # (B, 1, 256)
        
        # Stack as sequence of length 3: (B, 3, 256)
        seq = torch.cat([t, c, v], dim=1)
        
        # Cross-attention (modalities attending to each other)
        attn_out, _ = self.attention(seq, seq, seq) # (B, 3, 256)
        
        # Flatten back to (B, 768)
        flattened = attn_out.reshape(attn_out.size(0), -1)
        
        # Project to final 256D output
        fused = self.projection(flattened)
        return fused

class FusionMLP(nn.Module):
    """
    Projection MLP that fuses text, tabular, and vision embeddings.
    
    Architecture:
    - Input: Concatenated [e_txt (768D) || e_str (128D) || e_vis (512D)] = 1408D
    - Layer 1: Linear(896 → 512) + ReLU
    - Regularization: Dropout(0.3)
    - Layer 2: Linear(512 → 256)
    - Normalization: BatchNorm1d
    - Output: z ∈ ℝ^256
    
    The intermediate layers + ReLU + dropout prevent the fusion from collapsing
    into a trivially linear projection. The 256D bottleneck forces the network
    to learn a compact cross-modal representation.
    """
    
    def __init__(
        self,
        text_dim: int = FusionConfig.TEXT_DIM,  # 768
        tabular_dim: int = FusionConfig.TABULAR_DIM,  # 128
        hidden_dim: int = FusionConfig.HIDDEN_DIM_1,  # 512
        output_dim: int = FusionConfig.OUTPUT_DIM,  # 256
        dropout: float = FusionConfig.DROPOUT  # 0.3
    ):
        """
        Args:
            text_dim: Dimension of text embeddings (default 768)
            tabular_dim: Dimension of tabular embeddings (default 128)
            hidden_dim: Hidden layer dimension (default 512)
            output_dim: Output dimension (default 256)
            dropout: Dropout probability (default 0.3)
        """
        super().__init__()
        
        self.concat_dim = text_dim + tabular_dim + FusionConfig.VISION_DIM  # 1408
        self.output_dim = output_dim
        
        # Projection MLP architecture
        self.projection = nn.Sequential(
            # Layer 1: 896 → 512
            nn.Linear(self.concat_dim, hidden_dim),
            nn.ReLU(),
            
            # Regularization
            nn.Dropout(dropout),
            
            # Layer 2: 512 → 256
            nn.Linear(hidden_dim, output_dim),
            
            # Batch normalization for output stability
            nn.BatchNorm1d(output_dim)
        )
    
    def forward(self, text_emb: torch.Tensor, tabular_emb: torch.Tensor, vision_emb: torch.Tensor) -> torch.Tensor:
        """
        Fuse text, tabular, and vision embeddings into shared representation.
        
        Args:
            text_emb: Text embeddings of shape (batch_size, 768)
            tabular_emb: Tabular embeddings of shape (batch_size, 128)
            vision_emb: Vision embeddings of shape (batch_size, 512)
        
        Returns:
            Fused representation z of shape (batch_size, 256)
        """
        # Validate input shapes
        assert text_emb.dim() == 2, f"text_emb must be 2D, got {text_emb.dim()}D"
        assert tabular_emb.dim() == 2, f"tabular_emb must be 2D, got {tabular_emb.dim()}D"
        assert vision_emb.dim() == 2, f"vision_emb must be 2D, got {vision_emb.dim()}D"
        
        assert text_emb.size(1) == FusionConfig.TEXT_DIM, \
            f"text_emb must have {FusionConfig.TEXT_DIM} features, got {text_emb.size(1)}"
        assert tabular_emb.size(1) == FusionConfig.TABULAR_DIM, \
            f"tabular_emb must have {FusionConfig.TABULAR_DIM} features, got {tabular_emb.size(1)}"
        assert vision_emb.size(1) == FusionConfig.VISION_DIM, \
            f"vision_emb must have {FusionConfig.VISION_DIM} features, got {vision_emb.size(1)}"
            
        assert text_emb.size(0) == tabular_emb.size(0) == vision_emb.size(0), \
            f"Batch sizes must match: text {text_emb.size(0)} vs tabular {tabular_emb.size(0)} vs vision {vision_emb.size(0)}"
        
        # Concatenate along feature dimension: (batch_size, 1408)
        concatenated = torch.cat([text_emb, tabular_emb, vision_emb], dim=1)
        
        # Project through MLP: (batch_size, 896) → (batch_size, 256)
        fused = self.projection(concatenated)
        
        return fused


class MultimodalFusion:
    """
    End-to-end wrapper that orchestrates text encoder, tabular encoder, vision encoder and fusion MLP.
    Provides a single interface for processing raw inputs.
    """
    
    def __init__(self, text_encoder, tabular_encoder, vision_encoder, device: str = "cuda"):
        """
        Args:
            text_encoder: TextEncoder instance
            tabular_encoder: TabularEncoder instance
            vision_encoder: VisionEncoder instance
            device: "cuda" or "cpu"
        """
        self.text_encoder = text_encoder
        self.tabular_encoder = tabular_encoder
        self.vision_encoder = vision_encoder
        self.device = device
        
        # Initialize fusion MLP with Cross-Attention
        self.fusion_mlp = AttentionFusionMLP().to(device)
    
    def process(self, text: str, tabular_data: dict, image_path: str) -> torch.Tensor:
        """
        Process single sample through entire pipeline.
        
        Args:
            text: Raw text string
            tabular_data: Dictionary with structured features
            image_path: Path to image
        
        Returns:
            Fused representation z of shape (1, 256)
        """
        # Encode text
        text_emb = self.text_encoder.process(text)  # (1, 768)
        
        # Encode tabular
        tabular_emb = self.tabular_encoder.process(tabular_data)  # (1, 128)
        
        # Encode vision
        vision_emb = self.vision_encoder.process(image_path) # (1, 512)
        
        # Fuse
        fused = self.fusion_mlp(text_emb, tabular_emb, vision_emb)  # (1, 256)
        
        return fused
    
    def process_batch(self, texts: list, tabular_data_list: list, image_paths: list) -> torch.Tensor:
        """
        Process batch of samples through entire pipeline.
        
        Args:
            texts: List of text strings
            tabular_data_list: List of dictionaries with structured features
            image_paths: List of image paths
        
        Returns:
            Fused representations of shape (batch_size, 256)
        """
        assert len(texts) == len(tabular_data_list) == len(image_paths), "Inputs must have same length"
        
        # Encode texts
        text_embs = self.text_encoder.process_batch(texts)  # (batch_size, 768)
        
        # Encode tabular
        tabular_embs = self.tabular_encoder.process_batch(tabular_data_list)  # (batch_size, 128)
        
        # Encode vision
        vision_embs = self.vision_encoder.process_batch(image_paths) # (batch_size, 512)
        
        # Fuse
        fused = self.fusion_mlp(text_embs, tabular_embs, vision_embs)  # (batch_size, 256)
        
        return fused


if __name__ == "__main__":
    # Quick test of FusionMLP in isolation
    print("Testing FusionMLP...")
    
    fusion = FusionMLP()
    
    # Create dummy embeddings
    batch_size = 4
    text_emb = torch.randn(batch_size, FusionConfig.TEXT_DIM)  # (4, 768)
    tabular_emb = torch.randn(batch_size, FusionConfig.TABULAR_DIM)  # (4, 128)
    vision_emb = torch.randn(batch_size, FusionConfig.VISION_DIM)  # (4, 512)
    
    # Forward pass
    output = fusion(text_emb, tabular_emb, vision_emb)
    
    print(f"Text embedding shape: {text_emb.shape}")
    print(f"Tabular embedding shape: {tabular_emb.shape}")
    print(f"Fused output shape: {output.shape} (expected: torch.Size([{batch_size}, 256]))")
    print(f"Output sample values: {output[0, :10]}")
    
    # Verify output dimensions
    assert output.shape == (batch_size, FusionConfig.OUTPUT_DIM), \
        f"Output shape mismatch: {output.shape} vs {(batch_size, FusionConfig.OUTPUT_DIM)}"
    
    print("✓ FusionMLP test passed!")