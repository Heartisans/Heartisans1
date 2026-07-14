"""
Configuration and constants for AuctionMind model
"""

class TextEncoderConfig:
    """Settings for SBERT text encoder"""
    MODEL_NAME = "sentence-transformers/all-mpnet-base-v2"
    MAX_TOKENS = 512
    OUTPUT_DIM = 768
    NORMALIZE = True  # L2 normalization


class VisionEncoderConfig:
    """Settings for CLIP ViT vision encoder"""
    MODEL_NAME = "openai/clip-vit-base-patch32"
    OUTPUT_DIM = 512
    NORMALIZE = True  # L2 normalization

class TabularEncoderConfig:
    """Settings for tabular feature engineering"""
    MLP_HIDDEN_DIM = 256
    OUTPUT_DIM = 128
    
    # Bayesian target encoding smoothing strength
    BAYESIAN_SMOOTHING_LAMBDA = 3.0


class FusionConfig:
    """Settings for fusion layer"""
    TEXT_DIM = TextEncoderConfig.OUTPUT_DIM  # 768
    TABULAR_DIM = TabularEncoderConfig.OUTPUT_DIM  # 128
    VISION_DIM = VisionEncoderConfig.OUTPUT_DIM  # 512
    CONCAT_DIM = TEXT_DIM + TABULAR_DIM + VISION_DIM  # 1408
    
    # Projection MLP architecture
    HIDDEN_DIM_1 = 512
    OUTPUT_DIM = 256
    DROPOUT = 0.3


class ModelConfig:
    """Overall model config"""
    BATCH_SIZE = 32
    LEARNING_RATE = 1e-4
    DEVICE = "cuda"  # or "cpu"