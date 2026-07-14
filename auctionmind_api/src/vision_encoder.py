import torch
import torch.nn as nn
from transformers import CLIPVisionModelWithProjection, AutoProcessor
from PIL import Image
import logging
from typing import List, Union
from pathlib import Path
from src.config import VisionEncoderConfig
from src.device_utils import get_optimal_device

logger = logging.getLogger(__name__)

class VisionEncoder:
    """
    Image encoder using CLIP ViT.
    Extracts visual features from images to be fused with text and tabular data.
    """
    def __init__(self, device: str = None):
        self.device = device or get_optimal_device()
        
        logger.info(f"Loading VisionEncoder ({VisionEncoderConfig.MODEL_NAME}) on {self.device}...")
        
        # Load CLIP vision model
        self.processor = AutoProcessor.from_pretrained(VisionEncoderConfig.MODEL_NAME)
        self.model = CLIPVisionModelWithProjection.from_pretrained(VisionEncoderConfig.MODEL_NAME)
        
        self.model = self.model.to(self.device)
        self.model.eval()  # Keep frozen during fusion training unless specifically fine-tuning
        
        self.output_dim = VisionEncoderConfig.OUTPUT_DIM
        logger.info("VisionEncoder loaded successfully.")
        
    def _load_image(self, image_path: Union[str, Path]) -> Image.Image:
        """Helper to load image, returning a black image if loading fails."""
        try:
            return Image.open(image_path).convert("RGB")
        except Exception as e:
            logger.warning(f"Failed to load image {image_path}: {e}. Using fallback blank image.")
            return Image.new('RGB', (224, 224), color=(0, 0, 0))

    def process(self, image_path: Union[str, Path]) -> torch.Tensor:
        """
        Process a single image.
        Args:
            image_path: Path to the image file
        Returns:
            Tensor of shape (1, 512)
        """
        img = self._load_image(image_path)
        
        with torch.no_grad():
            inputs = self.processor(images=img, return_tensors="pt").to(self.device)
            outputs = self.model(**inputs)
            embeds = outputs.image_embeds  # (1, 512)
            
            if VisionEncoderConfig.NORMALIZE:
                embeds = embeds / embeds.norm(dim=-1, keepdim=True)
                
        return embeds
        
    def process_batch(self, image_paths: List[Union[str, Path]], batch_size: int = 32, show_progress_bar: bool = False) -> torch.Tensor:
        """
        Process a batch of images in chunks to prevent OOM.
        Args:
            image_paths: List of paths to the image files
            batch_size: Number of images to process at a time
            show_progress_bar: Whether to show tqdm progress bar
        Returns:
            Tensor of shape (total_images, 512)
        """
        all_embeds = []
        
        # Setup iterator
        iterator = range(0, len(image_paths), batch_size)
        if show_progress_bar:
            try:
                from tqdm import tqdm
                iterator = tqdm(iterator, desc="Encoding Images")
            except ImportError:
                pass

        with torch.no_grad():
            for i in iterator:
                batch_paths = image_paths[i:i + batch_size]
                images = [self._load_image(p) for p in batch_paths]
                
                inputs = self.processor(images=images, return_tensors="pt").to(self.device)
                outputs = self.model(**inputs)
                embeds = outputs.image_embeds
                
                if VisionEncoderConfig.NORMALIZE:
                    embeds = embeds / embeds.norm(dim=-1, keepdim=True)
                    
                all_embeds.append(embeds)
                
        return torch.cat(all_embeds, dim=0)

if __name__ == "__main__":
    # Test script
    import tempfile
    encoder = VisionEncoder(device="cpu")
    with tempfile.NamedTemporaryFile(suffix=".jpg") as tmp:
        img = Image.new('RGB', (224, 224), color=(255, 0, 0))
        img.save(tmp.name)
        
        res = encoder.process(tmp.name)
        print(f"Single shape: {res.shape}")
        
        batch_res = encoder.process_batch([tmp.name, tmp.name])
        print(f"Batch shape: {batch_res.shape}")
