"""
Pydantic v2 Input Schema Validation for AuctionMind
Defines the expected structure and constraints for tabular auction data.
Usage: TabularInputSchema(**raw_dict) will raise ValidationError if invalid
"""

from pydantic import BaseModel, field_validator
from typing import Optional
from src.exceptions import DataValidationError


class TabularInputSchema(BaseModel):
    """
    Schema for a single auction item's structured metadata.
    
    All fields are validated against business rules:
    - age: reasonable antique age (10-1000 years)
    - weight: positive mass measurement
    - brand: non-empty string (e.g., "Rolex", "Ming")
    - material: non-empty string (e.g., "Gold", "Porcelain")
    - seller_reputation: [0.0, 1.0] normalized score
    
    Pydantic automatically generates descriptive error messages for violations.
    """

    age: int
    weight: float
    brand: str
    material: str
    handmade: bool
    limited_edition: bool
    certificate_of_authenticity: bool
    seller_reputation: float
    dimensions: Optional[float] = None
    scratches: Optional[bool] = None

    @field_validator("age")
    @classmethod
    def validate_age(cls, v: int) -> int:
        """
        Age must be in reasonable range for antiques/collectibles.
        0: modern reproduction / contemporary art
        1-100: recent (20th century)
        100-500: historical (medieval to 18th century)
        500+: ancient (rare)
        """
        if not isinstance(v, int):
            raise ValueError(f"age must be an integer, got {type(v).__name__}")
        if not 0 <= v <= 1000:
            raise ValueError(f"age must be 0-1000 years, got {v}")
        return v

    @field_validator("weight")
    @classmethod
    def validate_weight(cls, v: float) -> float:
        """Weight must be positive. Units: grams."""
        if not isinstance(v, (int, float)):
            raise ValueError(f"weight must be numeric, got {type(v).__name__}")
        if v <= 0:
            raise ValueError(f"weight must be positive, got {v}")
        if v > 1_000_000:  # 1 metric ton — upper bound
            raise ValueError(f"weight {v}g exceeds reasonable limit (1M grams / 1 ton)")
        return float(v)

    @field_validator("seller_reputation")
    @classmethod
    def validate_seller_reputation(cls, v: float) -> float:
        """Seller reputation must be normalized to [0, 1]."""
        if not isinstance(v, (int, float)):
            raise ValueError(
                f"seller_reputation must be numeric, got {type(v).__name__}"
            )
        if not 0.0 <= v <= 1.0:
            raise ValueError(
                f"seller_reputation must be in [0.0, 1.0], got {v}"
            )
        return float(v)

    @field_validator("brand", "material")
    @classmethod
    def validate_non_empty_string(cls, v: str) -> str:
        """Brand and material must be non-empty strings."""
        if not isinstance(v, str):
            raise ValueError(f"field must be string, got {type(v).__name__}")
        if not v.strip():
            raise ValueError("field must not be empty or whitespace-only")
        # Normalize: lowercase and strip whitespace
        return v.strip().lower()

    @field_validator("dimensions")
    @classmethod
    def validate_dimensions(cls, v: Optional[float]) -> Optional[float]:
        """Dimensions (if provided) must be positive. Units: cm³."""
        if v is None:
            return None
        if not isinstance(v, (int, float)):
            raise ValueError(f"dimensions must be numeric or None, got {type(v).__name__}")
        if v <= 0:
            raise ValueError(f"dimensions must be positive if provided, got {v}")
        return float(v)

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "age": 250,
                    "weight": 5000.0,
                    "brand": "Ming",
                    "material": "porcelain",
                    "handmade": True,
                    "limited_edition": False,
                    "certificate_of_authenticity": True,
                    "seller_reputation": 0.92,
                    "dimensions": 12500.0,
                }
            ]
        }
    }


def validate_tabular_data(data: dict) -> dict:
    """
    Wrapper function for use in model.forward() and forward_batch().
    Attempts validation, wraps Pydantic ValidationError in DataValidationError.
    
    Usage:
        try:
            validated = validate_tabular_data(raw_dict)
        except DataValidationError as e:
            logger.error(f"Invalid input: {e}")
    
    Args:
        data: Raw dictionary from user
    
    Returns:
        Validated dict (may have normalized values: lowercase brand/material)
    
    Raises:
        DataValidationError: If validation fails
    """
    try:
        schema = TabularInputSchema(**data)
        return schema.model_dump()
    except Exception as e:
        raise DataValidationError(f"Tabular data validation failed: {e}") from e
