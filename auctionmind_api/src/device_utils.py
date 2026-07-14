"""
Utility functions for device detection and CUDA compatibility checks.
"""

import logging
import torch

logger = logging.getLogger(__name__)

def check_cuda_compatibility() -> bool:
    """
    Checks if CUDA is available and compatible with the current PyTorch installation.
    Specifically checks if the GPU compute capability is supported to prevent 
    'cudaErrorNoKernelImageForDevice' crashes.
    
    Returns:
        bool: True if CUDA is compatible and can execute kernels, False otherwise.
    """
    if not torch.cuda.is_available():
        return False
    try:
        # 1. Check device capability (Tesla P100 is 6.0, which is incompatible with some PyTorch 2.x builds)
        major, minor = torch.cuda.get_device_capability(0)
        if major < 7:
            logger.warning(
                "GPU compute capability %d.%d is less than 7.0, which is incompatible "
                "with the current PyTorch installation (e.g. Tesla P100 sm_60 mismatch). "
                "Falling back to CPU.", major, minor
            )
            return False
            
        # 2. Force kernel execution to verify (some capabilities match but compilation features do not)
        x = torch.randn(2, 2).cuda()
        y = torch.randn(2, 2).cuda()
        _ = x @ y
        return True
    except Exception as e:
        logger.warning(
            "CUDA is available but testing kernel execution failed (e.g., incompatible compute capability). "
            "Falling back to CPU. Error: %s", e
        )
        return False

def get_optimal_device() -> str:
    """
    Returns the optimal device ('cuda' or 'cpu') based on compatibility checks.
    
    Returns:
        str: "cuda" or "cpu"
    """
    return "cuda" if check_cuda_compatibility() else "cpu"
