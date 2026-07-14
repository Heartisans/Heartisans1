"""
Data loading and splitting utilities for AuctionMind.
The loader supports real CSV/Parquet files and a synthetic placeholder mode for development.
"""

import logging
from typing import List, Tuple

import numpy as np
import pandas as pd

from src.data_preprocessing import TextNormalizer

logger = logging.getLogger(__name__)


class DataLoader:
    """Load, validate, and split auction datasets."""

    REQUIRED_COLUMNS = [
        "title",
        "description",
        "provenance",
        "age",
        "weight",
        "brand",
        "material",
        "handmade",
        "limited_edition",
        "certificate_of_authenticity",
        "seller_reputation",
        "scratches",
        "has_valuable_gem",
        "gem_type",
        "has_expensive_material",
        "expensive_material_type",
        "origin",
        "extraction_confidence",
        "hammer_price",
        "date",
        "work_type",
    ]

    # Normalise origin aliases to a canonical lower-case country name
    _ORIGIN_ALIASES: dict = {
        "british": "united kingdom",
        "england": "united kingdom",
        "uk": "united kingdom",
        "great britain": "united kingdom",
        "u.k.": "united kingdom",
        "italia": "italy",
        "france, paris": "france",
        "paris": "france",
        "vienna, at": "austria",
        "wien": "austria",
        "usa": "usa",
        "united states": "usa",
        "u.s.a.": "usa",
        "americas": "usa",
        "peoples republic of china": "china",
        "prc": "china",
        "taiwan": "china",
        "nippon": "japan",
        "europe": "europe",
        "western europe": "europe",
    }

    def load(self, filepath: str) -> pd.DataFrame:
        if filepath.endswith(".parquet"):
            df = pd.read_parquet(filepath)
        else:
            df = pd.read_csv(filepath)

        df = self._normalize_real_dataset(df)
        self._validate_columns(df)

        df = df.copy()
        if "log_hammer_price" not in df.columns:
            df["log_hammer_price"] = np.log1p(df["hammer_price"])
        logger.info("Loaded %d records from %s", len(df), filepath)
        return df

    def _normalize_origin(self, val) -> str:
        """Collapse origin aliases to a canonical lower-case string."""
        if pd.isna(val) or str(val).strip() == "":
            return "unknown"
        key = str(val).strip().lower()
        return self._ORIGIN_ALIASES.get(key, key)

    def _normalize_real_dataset(self, df: pd.DataFrame) -> pd.DataFrame:
        """Map the real Heartisans CSV onto the internal placeholder schema."""
        normalized = df.copy()

        if all(col in df.columns for col in self.REQUIRED_COLUMNS):
            return normalized

        normalized["title"] = (
            normalized["work_type"].fillna("Unknown").astype(str).str.strip()
            + " "
            + normalized["brand"].fillna("Unknown").astype(str).str.strip()
            + " "
            + normalized["material_used"].fillna("Unknown").astype(str).str.strip()
        ).str.replace(r"\s+", " ", regex=True).str.strip()

        defects = normalized.get("defects", pd.Series([""] * len(normalized), index=normalized.index)).fillna("")
        colour = normalized.get("colour", pd.Series([""] * len(normalized), index=normalized.index)).fillna("")
        expensive_material = normalized.get("expensive_material", pd.Series([""] * len(normalized), index=normalized.index)).fillna("")
        valuable_gem = normalized.get("valuable_gem", pd.Series([""] * len(normalized), index=normalized.index)).fillna("")
        scratches_series = pd.Series(normalized.get("scratches", False), index=normalized.index).fillna(False).astype(bool)
        scratches_text = scratches_series.apply(lambda s: "scratches" if s else "")

        normalized["description"] = (
            defects.astype(str).str.strip()
            + " "
            + colour.astype(str).str.strip()
            + " "
            + expensive_material.astype(str).str.strip()
            + " "
            + valuable_gem.astype(str).str.strip()
            + " "
            + scratches_text
        ).str.replace(r"\s+", " ", regex=True).str.strip()

        normalized["provenance"] = normalized["origin"].fillna("Unknown").astype(str).str.strip()

        if "date_of_manufacture" in normalized.columns:
            year_series = pd.to_numeric(normalized["date_of_manufacture"].astype(str).str.extract(r"(\d{4})", expand=False), errors="coerce")
            normalized["age"] = (pd.Timestamp.now().year - year_series.fillna(pd.Timestamp.now().year)).fillna(0).astype(int)
        else:
            normalized["age"] = 0

        # Keep as raw object/string for proper parsing in preprocess_dataframe
        normalized["weight"] = normalized.get("weight")

        normalized["brand"] = normalized.get("brand", pd.Series(["Unknown"] * len(normalized), index=normalized.index)).fillna("Unknown").astype(str).str.strip()
        normalized["material"] = (
            normalized["material_used"].fillna("")
            .astype(str)
            .str.strip()
            .replace("", "Unknown")
        )

        normalized["handmade"] = normalized["work_type"].astype(str).str.lower().str.contains("hand", case=False, na=False)
        # Clean limited_edition: handles "T", "True ", "true", "1", etc.
        le_raw = normalized.get("limited_edition", pd.Series([False] * len(normalized), index=normalized.index))
        le_str = le_raw.astype(str).str.strip().str.lower()
        normalized["limited_edition"] = le_str.isin(["true", "1", "yes", "t", "y"]).astype(bool)

        normalized["certificate_of_authenticity"] = pd.Series(normalized.get("valuable_gem", False), index=normalized.index).fillna(False).astype(bool)
        normalized["scratches"] = scratches_series

        # ── NEW: valuable gem features ──────────────────────────────────────
        raw_gem = normalized.get("valuable_gem", pd.Series([None] * len(normalized), index=normalized.index))
        normalized["has_valuable_gem"] = raw_gem.notna() & (raw_gem.astype(str).str.strip() != "")
        normalized["gem_type"] = (
            raw_gem.fillna("none")
            .astype(str)
            .str.strip()
            .str.lower()
            .str.split(",").str[0]   # take first gem if multiple listed
            .str.strip()
            .replace("", "none")
        )

        # ── NEW: expensive material features ───────────────────────────────
        raw_exp_mat = normalized.get("expensive_material", pd.Series([None] * len(normalized), index=normalized.index))
        normalized["has_expensive_material"] = raw_exp_mat.notna() & (raw_exp_mat.astype(str).str.strip() != "")
        normalized["expensive_material_type"] = (
            raw_exp_mat.fillna("none")
            .astype(str)
            .str.strip()
            .str.lower()
            .replace("", "none")
        )

        # ── NEW: origin (country, normalised) ─────────────────────────────
        normalized["origin"] = normalized.get("origin", pd.Series([None] * len(normalized), index=normalized.index)).apply(self._normalize_origin)

        # ── NEW: extraction confidence ────────────────────────────────────
        if "extraction_confidence" in normalized.columns:
            raw_conf = pd.to_numeric(normalized["extraction_confidence"], errors="coerce")
        else:
            raw_conf = pd.Series([0.69] * len(normalized), index=normalized.index)
        normalized["extraction_confidence"] = raw_conf.fillna(0.69).clip(0.0, 1.0)

        # Keep as raw object/string for proper parsing/target encoding in preprocess_dataframe
        normalized["seller_reputation"] = normalized.get("seller_reputation")
        normalized["dimensions"] = normalized.get("dimensions")

        normalized["hammer_price"] = pd.to_numeric(normalized.get("current_market_price_inr"), errors="coerce")
        normalized["hammer_price"] = normalized["hammer_price"].fillna(0.0)

        if "scrape_timestamp" in normalized.columns:
            normalized["date"] = pd.to_datetime(normalized["scrape_timestamp"], errors="coerce")
        elif "date_of_manufacture" in normalized.columns:
            normalized["date"] = pd.to_datetime(normalized["date_of_manufacture"], errors="coerce")
        else:
            normalized["date"] = pd.Timestamp.now()
        normalized["date"] = normalized["date"].fillna(pd.Timestamp.now())

        return normalized


    def create_placeholder_dataframe(self, n: int = 100, seed: int = 42) -> pd.DataFrame:
        rng = np.random.default_rng(seed)
        df = pd.DataFrame(
            {
                "title": [f"Auction item {i}" for i in range(n)],
                "description": [f"Placeholder description for item {i}" for i in range(n)],
                "provenance": [f"Provenance {i % 5}" for i in range(n)],
                "age": rng.integers(10, 500, size=n),
                "weight": rng.uniform(100, 5000, size=n),
                "brand": rng.choice(["ming", "qing", "republican"], size=n),
                "material": rng.choice(["porcelain", "ceramic", "jade"], size=n),
                "handmade": rng.integers(0, 2, size=n).astype(bool),
                "limited_edition": rng.integers(0, 2, size=n).astype(bool),
                "certificate_of_authenticity": rng.integers(0, 2, size=n).astype(bool),
                "seller_reputation": rng.uniform(0.0, 1.0, size=n),
                "scratches": rng.choice([True, False], size=n),
                "dimensions": rng.uniform(10.0, 1000.0, size=n),
                "has_valuable_gem": rng.integers(0, 2, size=n).astype(bool),
                "gem_type": rng.choice(["diamond", "sapphire", "pearl", "none"], size=n),
                "has_expensive_material": rng.integers(0, 2, size=n).astype(bool),
                "expensive_material_type": rng.choice(["18k gold", "leather", "sterling silver", "none"], size=n),
                "origin": rng.choice(["france", "italy", "china", "usa", "japan", "unknown"], size=n),
                "extraction_confidence": rng.uniform(0.35, 1.0, size=n),
                "hammer_price": rng.uniform(100.0, 10000.0, size=n),
                "date": pd.date_range("2020-01-01", periods=n, freq="7D"),
                "work_type": rng.choice(["painting", "sculpture", "jewelry", "watch", "furniture"], size=n),
                "luxury_score": rng.uniform(0.0, 4.0, size=n),
                "material_value_class": rng.choice([1, 2, 3], size=n),
                "age_origin_bucket": rng.choice(["france_antique", "china_ancient", "usa_vintage", "unknown_unknown"], size=n),
                "work_type_material": rng.choice(["painting_oil", "jewelry_gold", "sculpture_bronze"], size=n),
                "desc_word_count": rng.integers(0, 1000, size=n).astype(float),
            }
        )
        df["log_hammer_price"] = np.log1p(df["hammer_price"])
        return df

    def _validate_columns(self, df: pd.DataFrame) -> None:
        missing = set(self.REQUIRED_COLUMNS) - set(df.columns)
        if missing:
            raise ValueError(f"Dataset missing required columns: {missing}")

    def split(
        self,
        df: pd.DataFrame,
        temporal: bool = True,
        ratios: tuple = (0.70, 0.15, 0.15),
        stratified: bool = False,
        n_bins: int = 10,
    ):
        """Split dataset into train/val/test.

        Args:
            temporal: Sort by date before splitting (chronological split).
            stratified: If True, use price-quantile-stratified random split so all
                        price tiers are represented in each split.  Overrides ``temporal``.
            n_bins: Number of quantile bins for stratified split.
        """
        if not np.isclose(sum(ratios), 1.0):
            raise ValueError("Ratios must sum to 1.0")

        working = df.copy().reset_index(drop=True)

        if stratified and "log_hammer_price" in working.columns:
            # Bin by log-price quantile for balanced representation
            working["_price_bin"] = pd.qcut(
                working["log_hammer_price"], q=n_bins, labels=False, duplicates="drop"
            )
            train_parts, val_parts, test_parts = [], [], []
            for _, group in working.groupby("_price_bin"):
                g = group.sample(frac=1.0, random_state=42).reset_index(drop=True)
                n = len(g)
                i1 = int(n * ratios[0])
                i2 = int(n * (ratios[0] + ratios[1]))
                train_parts.append(g.iloc[:i1])
                val_parts.append(g.iloc[i1:i2])
                test_parts.append(g.iloc[i2:])
            train = pd.concat(train_parts).sample(frac=1.0, random_state=42).reset_index(drop=True)
            val = pd.concat(val_parts).sample(frac=1.0, random_state=42).reset_index(drop=True)
            test = pd.concat(test_parts).sample(frac=1.0, random_state=42).reset_index(drop=True)
            # Remove temporary column
            for split_df in [train, val, test]:
                split_df.drop(columns=["_price_bin"], inplace=True, errors="ignore")
        elif temporal:
            working = working.sort_values("date").reset_index(drop=True)
            n = len(working)
            i1 = int(n * ratios[0])
            i2 = int(n * (ratios[0] + ratios[1]))
            train, val, test = working.iloc[:i1], working.iloc[i1:i2], working.iloc[i2:]
        else:
            working = working.sample(frac=1.0, random_state=42).reset_index(drop=True)
            n = len(working)
            i1 = int(n * ratios[0])
            i2 = int(n * (ratios[0] + ratios[1]))
            train, val, test = working.iloc[:i1], working.iloc[i1:i2], working.iloc[i2:]

        logger.info("Split → train:%d val:%d test:%d", len(train), len(val), len(test))
        return train, val, test

    def extract_features(self, df: pd.DataFrame):
        normalizer = TextNormalizer()
        texts = (
            df["title"].fillna("")
            + " "
            + df["description"].fillna("")
            + " "
            + df["provenance"].fillna("")
        ).apply(normalizer.process).tolist()

        tabular_cols = [
            "age",
            "weight",
            "brand",
            "material",
            "handmade",
            "limited_edition",
            "certificate_of_authenticity",
            "seller_reputation",
            "scratches",
            "dimensions",
            # ── Phase 5 new features ──────────────────────────────────────────
            "extraction_confidence",
            "has_valuable_gem",
            "gem_type",
            "has_expensive_material",
            "expensive_material_type",
            "origin",
            "work_type",
            "luxury_score",
            "material_value_class",
            "age_origin_bucket",
            "work_type_material",
            "desc_word_count",
        ]
        # Only include columns that actually exist in the dataframe
        tabular_cols = [c for c in tabular_cols if c in df.columns]
        tabular = df[tabular_cols].to_dict(orient="records")
        
        import os
        image_paths = []
        if "id" in df.columns:
            image_paths = [os.path.join("dataset", "images", f"{item_id}.jpg") for item_id in df["id"].astype(str)]
        else:
            # Fallback if id is not available (e.g., placeholder)
            image_paths = [os.path.join("dataset", "images", "dummy.jpg")] * len(df)
            
        return texts, tabular, image_paths
