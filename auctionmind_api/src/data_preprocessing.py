"""
Placeholder-aware data preprocessing utilities for AuctionMind.
These helpers are intentionally lightweight and work with both real and synthetic data.
"""

import re
import html
from pathlib import Path

import numpy as np
import pandas as pd


class MissingValueHandler:
    """Handle missing values in text and numeric columns."""

    def handle_numeric(self, series: pd.Series, strategy: str = "median") -> pd.Series:
        if strategy == "drop":
            return series.dropna()
        if strategy == "mean":
            return series.fillna(series.mean())
        if strategy == "median":
            return series.fillna(series.median())
        if strategy == "zero":
            return series.fillna(0)
        raise ValueError(f"Unknown strategy: {strategy}")

    def handle_text(self, series: pd.Series, strategy: str = "special_token") -> pd.Series:
        if strategy == "drop":
            return series.dropna()
        if strategy == "special_token":
            return series.fillna("[MISSING]")
        raise ValueError(f"Unknown strategy: {strategy}")


class OutlierHandler:
    """Detect and handle price outliers."""

    def detect_outliers(self, series: pd.Series, method: str = "iqr", threshold: float = 1.5) -> pd.Series:
        if method == "iqr":
            q1 = series.quantile(0.25)
            q3 = series.quantile(0.75)
            iqr = q3 - q1
            return (series < q1 - threshold * iqr) | (series > q3 + threshold * iqr)
        if method == "zscore":
            std = series.std()
            if np.isclose(std, 0):
                return pd.Series(False, index=series.index)
            z = (series - series.mean()) / std
            return z.abs() > threshold
        raise ValueError(f"Unknown method: {method}")

    def handle_outliers(self, df: pd.DataFrame, target_col: str, action: str = "flag") -> pd.DataFrame:
        mask = self.detect_outliers(df[target_col])
        if action == "flag":
            result = df.copy()
            result["is_outlier"] = mask.astype(bool)
            return result
        if action == "remove":
            return df.loc[~mask].reset_index(drop=True)
        if action == "cap":
            result = df.copy()
            lo = result[target_col].quantile(0.02)
            hi = result[target_col].quantile(0.98)
            result[target_col] = result[target_col].clip(lo, hi)
            return result
        raise ValueError(f"Unknown action: {action}")


class TextNormalizer:
    """Normalize text length and clean special characters."""

    def normalize_length(self, text: str, min_words: int = 5, max_words: int = 200) -> str:
        words = text.split()
        if len(words) < min_words:
            text = text + (" [PAD]" * (min_words - len(words)))
        elif len(words) > max_words:
            text = " ".join(words[-max_words:])
        return text

    def clean(self, text: str) -> str:
        if text is None:
            return ""

        text = html.unescape(text)
        text = re.sub(r"<[^>]+>", " ", text)
        text = re.sub(r"\$\d+(?:\.\d+)?", " ", text)
        text = re.sub(r"[^\w\s%]", " ", text, flags=re.UNICODE)
        text = re.sub(r"\s+", " ", text).strip().lower()
        return text

    def process(self, text: str) -> str:
        return self.normalize_length(self.clean(text))


class ClassWeightComputer:
    """Compute per-sample weights for imbalanced category distributions."""

    def compute(self, series: pd.Series) -> pd.Series:
        from sklearn.utils.class_weight import compute_class_weight

        classes = series.unique()
        weights = compute_class_weight("balanced", classes=classes, y=series)
        weight_map = dict(zip(classes, weights))
        return series.map(weight_map)


def save_preprocessed_dataset(df: pd.DataFrame, path: str) -> str:
    """Persist a cleaned dataset to disk for reuse across runs."""
    out_path = Path(path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(out_path, index=False)
    return str(out_path)


def load_preprocessed_dataset(path: str) -> pd.DataFrame:
    """Load a previously saved cleaned dataset."""
    return pd.read_csv(path)


def parse_weight_to_grams(weight_str) -> float:
    if pd.isna(weight_str):
        return np.nan
    s = str(weight_str).lower().strip()
    if not s:
        return np.nan
    match = re.search(r"(\d+(?:\.\d+)?)", s)
    if not match:
        return np.nan
    val = float(match.group(1))
    if "kg" in s or "kilogram" in s:
        return val * 1000.0
    elif "lb" in s or "pound" in s:
        return val * 453.592
    elif "oz" in s or "ounce" in s:
        return val * 28.3495
    elif "ct" in s or "carat" in s:
        return val * 0.2
    return val


def parse_dimensions_to_cm3(dim_str) -> float:
    if pd.isna(dim_str):
        return np.nan
    s = str(dim_str).lower().strip()
    if not s or s == 'string or null':
        return np.nan
    paren_cm_match = re.search(r'\(([^)]*cm[^)]*)\)', s)
    if paren_cm_match:
        s = paren_cm_match.group(1)
    unit_factor = 1.0
    if 'inch' in s or 'in' in s or '"' in s:
        unit_factor = 2.54
    elif 'mm' in s or 'millimeter' in s:
        unit_factor = 0.1
    elif 'm' in s and not ('cm' in s or 'mm' in s):
        unit_factor = 100.0
    fracs = re.findall(r'(\d+)\s*-\s*(\d+)/(\d+)', s)
    for f in fracs:
        whole = float(f[0])
        num = float(f[1])
        denom = float(f[2])
        val = whole + num / denom
        s = s.replace(f'{f[0]} - {f[1]}/{f[2]}', str(val))
        s = s.replace(f'{f[0]}-{f[1]}/{f[2]}', str(val))
    fracs_only = re.findall(r'(\d+)/(\d+)', s)
    for f in fracs_only:
        num = float(f[0])
        denom = float(f[1])
        val = num / denom
        s = s.replace(f'{f[0]}/{f[1]}', str(val))
    nums_str = re.findall(r'(\d+(?:\.\d+)?)', s)
    if not nums_str:
        return np.nan
    numbers = [float(n) for n in nums_str]
    numbers = [n for n in numbers if n > 0]
    if not numbers:
        return np.nan
    numbers = numbers[:3]
    if len(numbers) == 3:
        val = (numbers[0] * unit_factor) * (numbers[1] * unit_factor) * (numbers[2] * unit_factor)
    elif len(numbers) == 2:
        val = (numbers[0] * unit_factor) * (numbers[1] * unit_factor) * 1.0
    else:
        val = (numbers[0] * unit_factor) ** 3
        
    return float(np.clip(val, 0.001, 10000000.0))


# Approximate dynasty/period → median year lookup (AD)
_DYNASTY_YEAR_MAP = {
    "northern qi": 565, "sui": 590, "tang": 750, "song": 1100,
    "yuan": 1300, "ming": 1500, "qing": 1800, "han": 100,
    "zhou": -700, "shang": -1300, "xia": -2000,
    "edo": 1750, "meiji": 1890, "taisho": 1918, "showa": 1960,
    "mughal": 1650, "ottoman": 1700,
    "roman": 200, "greek": -300, "egyptian": -2000,
    "renaissance": 1500, "baroque": 1680, "rococo": 1740,
    "neoclassical": 1800, "art deco": 1930, "art nouveau": 1905,
    "victorian": 1875, "georgian": 1810, "regency": 1815,
    "louis xv": 1745, "louis xvi": 1780, "napoleon": 1810,
}

_CENTURY_QUALIFIER_MAP = {
    "early": 0.15, "mid": 0.50, "late": 0.75,
    "first half": 0.25, "second half": 0.75,
}


def parse_age_from_manufacture_date(date_str) -> float:
    """Parse a manufacture date string into approximate age in years.

    Handles:
    - Plain years: ``"1957"`` → 69
    - Year ranges: ``"1877-1962"`` → midpoint
    - Century phrases: ``"late 20th century"`` → ≈55 years
    - Dynasty names: ``"Northern Qi / Sui Dynasty"`` → ≈1435 years
    - Combined: ``"19th century"`` → ≈175 years
    """
    current_year = 2025

    if pd.isna(date_str):
        return np.nan
    s = str(date_str).lower().strip()
    if not s:
        return np.nan

    # 1. Check for dynasty/period keywords
    for dynasty, approx_year in _DYNASTY_YEAR_MAP.items():
        if dynasty in s:
            return float(max(0, current_year - approx_year))

    # 2. Extract all 4-digit years
    years = [int(y) for y in re.findall(r"\b(\d{4})\b", s) if 0 <= int(y) <= current_year + 1]

    if years:
        # Range like "1877-1962"
        if len(years) >= 2:
            mid = sum(years) / len(years)
        else:
            mid = years[0]
        return float(max(0, current_year - mid))

    # 3. Century phrases: "19th century", "late 20th century"
    century_match = re.search(r"(\d+)(?:st|nd|rd|th)\s+century", s)
    if century_match:
        century = int(century_match.group(1))
        base_year = (century - 1) * 100  # 19th century → 1800
        qualifier = 0.50  # default to mid-century
        for q_word, q_offset in _CENTURY_QUALIFIER_MAP.items():
            if q_word in s:
                qualifier = q_offset
                break
        approx_year = base_year + int(100 * qualifier)
        return float(max(0, current_year - approx_year))

    # 4. 2-digit years (rare) — skip to avoid false matches
    return np.nan



def preprocess_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """Apply lightweight real-world preprocessing to noisy auction data."""
    working = df.copy()

    missing_handler = MissingValueHandler()
    normalizer = TextNormalizer()
    outlier_handler = OutlierHandler()

    # Preprocess dimensions
    if "dimensions" in working.columns:
        if working["dimensions"].dtype == object or working["dimensions"].dtype == str:
            working["dimensions"] = working["dimensions"].apply(parse_dimensions_to_cm3)
        else:
            working["dimensions"] = pd.to_numeric(working["dimensions"], errors="coerce")
        
        # Impute missing dimensions using material-grouped median if available
        if "material" in working.columns:
            group_meds = working.groupby("material")["dimensions"].transform("median")
            working["dimensions"] = working["dimensions"].fillna(group_meds)
        elif "material_used" in working.columns:
            group_meds = working.groupby("material_used")["dimensions"].transform("median")
            working["dimensions"] = working["dimensions"].fillna(group_meds)
            
        global_med = working["dimensions"].median()
        if pd.isna(global_med) or global_med <= 0:
            global_med = 100.0
        working["dimensions"] = working["dimensions"].fillna(global_med).clip(0.0, None)

    # Preprocess weight
    if "weight" in working.columns:
        if working["weight"].dtype == object or working["weight"].dtype == str:
            working["weight"] = working["weight"].apply(parse_weight_to_grams)
        else:
            working["weight"] = pd.to_numeric(working["weight"], errors="coerce")
        
        # Impute missing weights using material-grouped median if available
        if "material" in working.columns:
            group_meds = working.groupby("material")["weight"].transform("median")
            working["weight"] = working["weight"].fillna(group_meds)
        elif "material_used" in working.columns:
            group_meds = working.groupby("material_used")["weight"].transform("median")
            working["weight"] = working["weight"].fillna(group_meds)
            
        global_med = working["weight"].median()
        if pd.isna(global_med) or global_med <= 0:
            global_med = 50.0
        working["weight"] = working["weight"].fillna(global_med).clip(0.0, None)

    # Preprocess seller reputation
    if "seller_reputation" in working.columns:
        is_numeric = False
        try:
            non_nulls = working["seller_reputation"].dropna()
            if len(non_nulls) > 0:
                pd.to_numeric(non_nulls, errors="raise")
                is_numeric = True
        except (ValueError, TypeError):
            is_numeric = False

        if is_numeric:
            working["seller_reputation"] = pd.to_numeric(working["seller_reputation"], errors="coerce").clip(0.0, 1.0).fillna(0.5)
        else:
            # Target encode string reputation
            seller_col = working["seller_reputation"].fillna("Unknown").astype(str).str.strip()
            price_col = "current_market_price_inr" if "current_market_price_inr" in working.columns else "hammer_price"
            if price_col in working.columns:
                temp_log_price = np.log1p(pd.to_numeric(working[price_col], errors="coerce").fillna(0.0))
                means = temp_log_price.groupby(seller_col).transform("mean")
                min_mean = means.min()
                max_mean = means.max()
                if max_mean != min_mean:
                    working["seller_reputation"] = (means - min_mean) / (max_mean - min_mean)
                else:
                    working["seller_reputation"] = 0.5
            else:
                working["seller_reputation"] = 0.5
            working["seller_reputation"] = working["seller_reputation"].fillna(0.5).astype(float)

    # Improve age from raw manufacture date when available
    if "date_of_manufacture" in working.columns and "age" in working.columns:
        parsed_ages = working["date_of_manufacture"].apply(parse_age_from_manufacture_date)
        # Only override where current age is 0 or missing and parsed age is valid
        mask = (parsed_ages.notna()) & ((working["age"].isna()) | (working["age"] == 0))
        working.loc[mask, "age"] = parsed_ages[mask]

    # Preprocess other numeric columns
    numeric_cols = [c for c in ["age", "extraction_confidence", "hammer_price"] if c in working.columns]
    for col in numeric_cols:
        working[col] = pd.to_numeric(working[col], errors="coerce")
        if col == "age":
            working[col] = working[col].clip(0.0, 2025.0)
        elif col == "extraction_confidence":
            working[col] = working[col].clip(0.0, 1.0)
        
        med = working[col].median()
        if pd.isna(med):
            med = 0.0 if col != "extraction_confidence" else 0.69
        working[col] = working[col].fillna(med)

    # --- Phase 6: Feature Engineering ---
    # A. Luxury composite score
    if all(c in working.columns for c in ["has_valuable_gem", "has_expensive_material", "limited_edition", "certificate_of_authenticity"]):
        working["luxury_score"] = (
            (working["has_valuable_gem"].astype(float) * 1.5) +
            (working["has_expensive_material"].astype(float) * 1.0) +
            (working["limited_edition"].astype(float) * 0.8) +
            (working["certificate_of_authenticity"].astype(float) * 0.7)
        )
    else:
        working["luxury_score"] = 0.0

    # B. Price-per-gram proxy (material_value_class)
    if "material" in working.columns:
        mat_str = working["material"].astype(str).str.lower()
        premium_mats = ["gold", "silver", "jade", "ivory", "platinum", "diamond", "coral"]
        luxury_mats = ["18k gold", "24k gold", "platinum", "diamond", "emerald", "ruby", "sapphire"]
        
        # 1=base, 2=premium, 3=luxury
        working["material_value_class"] = 1
        working.loc[mat_str.apply(lambda x: any(m in str(x) for m in premium_mats)), "material_value_class"] = 2
        working.loc[mat_str.apply(lambda x: any(m in str(x) for m in luxury_mats)), "material_value_class"] = 3
    else:
        working["material_value_class"] = 1

    # C. Age x origin bucket
    if "age" in working.columns and "origin" in working.columns:
        age_bins = [0, 50, 150, 500, float("inf")]
        age_labels = ["modern", "vintage", "antique", "ancient"]
        age_buckets = pd.cut(working["age"], bins=age_bins, labels=age_labels, right=False)
        age_buckets = age_buckets.astype(str).replace("nan", "unknown")
        working["age_origin_bucket"] = working["origin"].astype(str) + "_" + age_buckets
    else:
        working["age_origin_bucket"] = "unknown_unknown"

    # D. Interaction: work_type x material
    if "work_type" in working.columns and "material" in working.columns:
        wt = working["work_type"].astype(str).str.lower().str.replace("unknown", "")
        mat = working["material"].astype(str).str.lower().str.replace("unknown", "")
        working["work_type_material"] = wt + "_" + mat
    else:
        working["work_type_material"] = "unknown_unknown"

    # E. Text Length: description word count
    if "description" in working.columns:
        working["desc_word_count"] = working["description"].fillna("").astype(str).apply(lambda x: len(str(x).split()))
    else:
        working["desc_word_count"] = 0

    text_cols = [c for c in ["title", "description", "provenance", "brand", "material"] if c in working.columns]
    for col in text_cols:
        working[col] = working[col].fillna("Unknown").astype(str)
        if col in {"title", "description", "provenance"}:
            working[col] = working[col].apply(lambda x: normalizer.process(x))
        else:
            working[col] = working[col].apply(lambda x: normalizer.clean(x).strip().lower() or "unknown")

    # Clean limited_edition dirty values before coercing to bool
    if "limited_edition" in working.columns:
        le = working["limited_edition"].astype(str).str.strip().str.lower()
        working["limited_edition"] = le.isin(["true", "1", "yes", "t", "y"]).astype(bool)

    bool_cols = [c for c in ["handmade", "certificate_of_authenticity", "has_valuable_gem", "has_expensive_material"] if c in working.columns]
    for col in bool_cols:
        working[col] = working[col].fillna(False).astype(bool)

    # Impute new categorical columns
    for col in ["origin", "gem_type", "expensive_material_type"]:
        if col in working.columns:
            working[col] = working[col].fillna("unknown").astype(str).str.strip().str.lower().replace("", "unknown")

    if "hammer_price" in working.columns:
        working = outlier_handler.handle_outliers(working, "hammer_price", action="cap")
        working["log_hammer_price"] = np.log1p(working["hammer_price"])

    return working
