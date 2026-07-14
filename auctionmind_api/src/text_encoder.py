"""
Text Encoding Pipeline using SBERT (Sentence-BERT)
Handles text cleaning, embedding generation, and L2 normalization
"""

import re
import unicodedata
import torch
from sentence_transformers import SentenceTransformer
from typing import Optional
from src.config import TextEncoderConfig


class TextCleaner:
    """Cleans raw text input following AuctionMind preprocessing spec"""
    
    @staticmethod
    def clean(text: str) -> str:
        """
        Clean text by:
        1. Unicode normalization (NFC form)
        2. HTML tag stripping
        3. Lowercasing
        4. Whitespace normalization
        
        Args:
            text: Raw input text string
            
        Returns:
            Cleaned text string
        """
        # Step 1: Unicode normalization (NFC form)
        text = unicodedata.normalize('NFC', text)
        
        # Step 2: Strip HTML tags
        text = re.sub(r'<[^>]+>', '', text)
        
        # Step 3: Lowercase
        text = text.lower()
        
        # Step 4: Normalize whitespace
        # Replace multiple spaces/tabs/newlines with single space
        text = re.sub(r'\s+', ' ', text)
        text = text.strip()
        
        return text


class TextEncoder:
    """
    SBERT-based text encoder for product titles, descriptions, and provenance.
    Outputs 768-dimensional L2-normalized embeddings.
    """
    
    def __init__(self, device: str = "cuda"):
        """
        Initialize SBERT model
        
        Args:
            device: "cuda" or "cpu"
        """
        self.device = device
        self.model = SentenceTransformer(
            TextEncoderConfig.MODEL_NAME,
            device=device
        )
        self.cleaner = TextCleaner()
        
    def process(self, text: str) -> torch.Tensor:
        """
        Process single text input: clean → embed → L2-normalize
        
        Args:
            text: Raw text string (title + description + provenance)
            
        Returns:
            Tensor of shape (1, 768) representing L2-normalized embedding
        """
        # Clean text
        cleaned = self.cleaner.clean(text)
        
        # Generate embedding using SBERT (output shape: (1, 768))
        embedding = self.model.encode(
            cleaned,
            convert_to_tensor=True,
            show_progress_bar=False
        )
        
        # L2-normalize: divide by norm to get unit vector
        # embedding shape: (768,) → reshape to (1, 768) for batch consistency
        embedding = embedding.unsqueeze(0)  # Now (1, 768)
        normalized = torch.nn.functional.normalize(embedding, p=2, dim=1)
        
        return normalized
    
    def process_batch(self, texts: list, show_progress_bar: bool = False) -> torch.Tensor:
        """
        Process batch of text inputs
        
        Args:
            texts: List of text strings
            show_progress_bar: Whether to show progress bar during encoding
            
        Returns:
            Tensor of shape (batch_size, 768) with L2-normalized embeddings
        """
        # Clean all texts
        cleaned_texts = [self.cleaner.clean(text) for text in texts]
        
        # Batch encode
        embeddings = self.model.encode(
            cleaned_texts,
            convert_to_tensor=True,
            show_progress_bar=show_progress_bar
        )
        
        # L2-normalize (batch operation)
        normalized = torch.nn.functional.normalize(embeddings, p=2, dim=1)
        
        return normalized


if __name__ == "__main__":
    # Quick test
    print("Testing TextEncoder...")
    encoder = TextEncoder(device="cpu")
    
    sample_text = "Antique Ming Dynasty vase, blue and white porcelain, excellent condition. Certificate of authenticity included."
    
    result = encoder.process(sample_text)
    print(f"Output shape: {result.shape}")
    print(f"Output norm (should be ~1.0): {torch.norm(result, p=2, dim=1).item():.6f}")
    print(f"First 10 values: {result[0, :10]}")