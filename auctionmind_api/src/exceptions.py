"""
Custom Exception Hierarchy for AuctionMind
Enables fine-grained error handling and meaningful error messages
"""


class AuctionMindException(Exception):
    """
    Base exception class for all AuctionMind errors.
    All other custom exceptions inherit from this.
    Allows catching all AuctionMind-specific errors: except AuctionMindException
    """
    pass


class DataValidationError(AuctionMindException):
    """
    Raised when input data fails schema validation.
    Examples:
    - seller_reputation = 1.5 (must be [0, 1])
    - age = -10 (must be [0, 1000])
    - brand = "" (must be non-empty string)
    
    Pydantic will raise this with detailed field info.
    """
    pass


class ModelStateError(AuctionMindException):
    """
    Raised when model is in invalid state for the requested operation.
    Examples:
    - Calling forward() before fit_tabular_encoder()
    - Calling predict() before training pricing heads
    - Loading checkpoint for non-existent model
    
    Prevents silent failures from misuse.
    """
    pass


class EmbeddingError(AuctionMindException):
    """
    Raised when embedding generation fails.
    Examples:
    - SBERT model fails to load
    - TabularEncoder not fitted
    - Text is too long for SBERT truncation
    - Numeric features produce NaN after preprocessing
    
    Distinct from DataValidationError — embedding is a runtime issue.
    """
    pass


class FAISSError(AuctionMindException):
    """
    Raised when FAISS operations fail.
    Examples:
    - Index not built before retrieval
    - Query embedding has wrong dimension
    - Disk cache corrupted
    """
    pass


class PricePredictionError(AuctionMindException):
    """
    Raised when price prediction fails.
    Examples:
    - CatBoost/XGBoost model not trained
    - Embeddings have wrong shape
    - Predictions contain NaN/Inf
    """
    pass
