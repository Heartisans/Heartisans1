"""
Structured Feature Engineering Pipeline
Handles continuous features, categorical encoding, and tabular MLP projection
"""

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from typing import Dict, List, Optional, Tuple
from sklearn.preprocessing import MinMaxScaler
from src.config import TabularEncoderConfig
from src.device_utils import get_optimal_device


class BayesianTargetEncoder:
    """
    Bayesian target encoder for high-cardinality categorical features.
    Maps rare categories toward global mean to prevent overfitting.
    
    Formula: v̂_c = (n_c * p̄_c + λ * p̄_global) / (n_c + λ)
    where:
      - n_c: count of training examples in category c
      - p̄_c: mean log-price within category c
      - p̄_global: global mean log-price
      - λ: smoothing strength (prevents rare categories from outliers)
    """
    
    def __init__(self, smoothing_lambda: float = 1.0):
        """
        Args:
            smoothing_lambda: Smoothing strength (higher = more regularization)
        """
        self.smoothing_lambda = smoothing_lambda
        self.global_mean = None
        self.category_stats = {}  # {feature: {category: (mean, count)}}
        self.is_fitted = False
    
    def fit(self, df: pd.DataFrame, target: pd.Series, categorical_features: List[str]):
        """
        Fit encoder on training data
        
        Args:
            df: DataFrame with categorical features
            target: Target variable (log-price)
            categorical_features: List of column names to encode
        """
        # Compute global statistics
        self.global_mean = target.mean()
        
        # Create temporary dataframe with target for groupby operation
        temp_df = df.copy()
        temp_df['__target__'] = target.values
        
        # Compute per-category statistics
        for feature in categorical_features:
            grouped = temp_df.groupby(feature)['__target__']
            self.category_stats[feature] = {
                cat: (group.mean(), len(group))
                for cat, group in grouped
            }
        
        self.is_fitted = True
    
    def encode(self, df: pd.DataFrame, categorical_features: List[str]) -> pd.DataFrame:
        """
        Encode categorical features using fitted statistics
        
        Args:
            df: DataFrame with categorical features
            categorical_features: Features to encode
            
        Returns:
            DataFrame with encoded features (numeric values)
        """
        assert self.is_fitted, "Encoder must be fitted first"
        
        encoded_df = df.copy()
        
        for feature in categorical_features:
            encoded_values = []
            
            for category in df[feature]:
                if category in self.category_stats[feature]:
                    mean_price, count = self.category_stats[feature][category]
                else:
                    # Unseen category: default to global mean
                    mean_price = self.global_mean
                    count = 0
                
                # Bayesian formula
                smoothed = (count * mean_price + self.smoothing_lambda * self.global_mean) / \
                           (count + self.smoothing_lambda)
                encoded_values.append(smoothed)
            
            encoded_df[feature] = encoded_values
        
        return encoded_df


class TabularFeatureEngineer:
    """
    Preprocesses structured metadata into 128-dimensional embeddings.
    
    Pipeline:
    1. Log-transform continuous features (age, weight, dimensions)
    2. Min-Max scale to [0, 1]
    3. Bayesian target encode high-cardinality categoricals
    4. One-hot encode Boolean flags
    5. Pass through 2-layer MLP: (concat_dim) → 256 → 128
    """
    
    def __init__(self):
        """Initialize feature engineering components"""
        self.scaler = MinMaxScaler()
        self.target_encoder = BayesianTargetEncoder(
            smoothing_lambda=TabularEncoderConfig.BAYESIAN_SMOOTHING_LAMBDA
        )
        self.continuous_features = []
        self.categorical_features = []
        self.boolean_features = []
        self.is_fitted = False
    
    def fit(
        self,
        df: pd.DataFrame,
        target: pd.Series,
        continuous_cols: List[str],
        categorical_cols: List[str],
        boolean_cols: List[str]
    ):
        """
        Fit preprocessors on training data
        
        Args:
            df: Training DataFrame
            target: Target variable (log-prices)
            continuous_cols: Names of continuous features (age, weight, etc.)
            categorical_cols: Names of high-cardinality features (brand, material, etc.)
            boolean_cols: Names of Boolean features (handmade, limited_edition, etc.)
        """
        self.continuous_features = continuous_cols
        self.categorical_features = categorical_cols
        self.boolean_features = boolean_cols
        
        # Fit MinMaxScaler on log-transformed continuous features
        log_transformed = np.log1p(df[continuous_cols].values)  # log1p = log(1 + x)
        self.scaler.fit(log_transformed)
        
        # Fit Bayesian target encoder
        self.target_encoder.fit(df, target, categorical_cols)
        
        self.is_fitted = True
    
    def preprocess(self, data: Dict) -> np.ndarray:
        """
        Preprocess a single sample into a numeric vector
        
        Args:
            data: Dictionary with keys matching fitted column names
                  {
                    'age': 250,  # years
                    'weight': 5000,  # grams
                    'brand': 'Ming',  # category
                    'material': 'porcelain',  # category
                    'handmade': True,  # Boolean
                    'limited_edition': False  # Boolean
                  }
        
        Returns:
            Preprocessed feature vector (numeric array)
        """
        assert self.is_fitted, "Preprocessor must be fitted first"
        
        features = []
        
        # 1. Continuous features: log-transform → min-max scale
        continuous_values = []
        for col in self.continuous_features:
            val = data.get(col, 0)
            continuous_values.append(val)
        
        continuous_array = np.array(continuous_values).reshape(1, -1)
        log_transformed = np.log1p(continuous_array)
        scaled = self.scaler.transform(log_transformed)
        features.extend(scaled[0])
        
        # 2. Categorical features: Bayesian target encoding
        categorical_dict = {col: data.get(col) for col in self.categorical_features}
        categorical_df = pd.DataFrame([categorical_dict])
        
        encoded_df = self.target_encoder.encode(categorical_df, self.categorical_features)
        features.extend(encoded_df.values[0])
        
        # 3. Boolean features: direct one-hot (0 or 1)
        for col in self.boolean_features:
            val = 1.0 if data.get(col, False) else 0.0
            features.append(val)
        
        return np.array(features, dtype=np.float32)
    
    @property
    def output_dim(self) -> int:
        """Calculate dimension after preprocessing (before MLP)"""
        if not self.is_fitted:
            raise RuntimeError("Preprocessor must be fitted first")
        return len(self.continuous_features) + len(self.categorical_features) + len(self.boolean_features)


class TabularMLP(nn.Module):
    """
    2-layer MLP that projects preprocessed features into 128D embedding.
    Architecture: (input_dim) → 256 (ReLU) → 128
    """
    
    def __init__(self, input_dim: int):
        """
        Args:
            input_dim: Dimension of preprocessed features
        """
        super().__init__()
        self.mlp = nn.Sequential(
            nn.Linear(input_dim, TabularEncoderConfig.MLP_HIDDEN_DIM),
            nn.ReLU(),
            nn.Linear(TabularEncoderConfig.MLP_HIDDEN_DIM, TabularEncoderConfig.OUTPUT_DIM)
        )
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Args:
            x: Tensor of shape (batch_size, input_dim)
        
        Returns:
            Tensor of shape (batch_size, 128)
        """
        return self.mlp(x)


class TabularEncoder:
    """
    Complete tabular encoding pipeline combining preprocessing + MLP
    """
    
    def __init__(self, device: Optional[str] = None):
        """Initialize tabular encoder"""
        self.engineer = TabularFeatureEngineer()
        self.mlp = None
        self.device = device or get_optimal_device()
    
    def fit(
        self,
        df: pd.DataFrame,
        target: pd.Series,
        continuous_cols: List[str],
        categorical_cols: List[str],
        boolean_cols: List[str]
    ):
        """Fit preprocessor and initialize MLP"""
        self.engineer.fit(df, target, continuous_cols, categorical_cols, boolean_cols)
        input_dim = self.engineer.output_dim
        self.mlp = TabularMLP(input_dim).to(self.device)
    
    def process(self, data: Dict) -> torch.Tensor:
        """
        Process single sample: preprocess → pass through MLP
        
        Args:
            data: Dictionary with feature values
        
        Returns:
            Tensor of shape (1, 128)
        """
        assert self.mlp is not None, "Encoder must be fitted first"
        
        # Preprocess to numeric vector
        features = self.engineer.preprocess(data)
        
        # Convert to tensor and pass through MLP
        features_tensor = torch.from_numpy(features).float().to(self.device)
        features_tensor = features_tensor.unsqueeze(0)  # Add batch dimension: (1, input_dim)
        
        output = self.mlp(features_tensor)  # (1, 128)
        return output
    
    def process_batch(self, data_list: List[Dict], show_progress: bool = False) -> torch.Tensor:
        """
        Process batch of samples
        
        Args:
            data_list: List of dictionaries
            show_progress: Whether to show progress bar during preprocessing
        
        Returns:
            Tensor of shape (batch_size, 128)
        """
        assert self.mlp is not None, "Encoder must be fitted first"
        
        # Preprocess all samples
        if show_progress:
            from tqdm import tqdm
            features_list = [self.engineer.preprocess(data) for data in tqdm(data_list, desc="Preprocessing tabular batch")]
        else:
            features_list = [self.engineer.preprocess(data) for data in data_list]
            
        features_batch = np.array(features_list, dtype=np.float32)
        
        # Convert to tensor and pass through MLP
        features_tensor = torch.from_numpy(features_batch).float().to(self.device)
        
        output = self.mlp(features_tensor)  # (batch_size, 128)
        return output


if __name__ == "__main__":
    # Quick test
    print("Testing TabularEncoder...")
    
    # Create dummy training data
    np.random.seed(42)
    df_train = pd.DataFrame({
        'age': np.random.randint(10, 500, 100),
        'weight': np.random.randint(100, 5000, 100),
        'brand': np.random.choice(['Ming', 'Qing', 'Republican'], 100),
        'material': np.random.choice(['porcelain', 'ceramic', 'jade'], 100),
        'handmade': np.random.choice([True, False], 100),
        'limited_edition': np.random.choice([True, False], 100),
    })
    target_train = pd.Series(np.random.normal(8, 1, 100))  # log-prices
    
    # Fit encoder
    encoder = TabularEncoder()
    encoder.fit(
        df_train,
        target_train,
        continuous_cols=['age', 'weight'],
        categorical_cols=['brand', 'material'],
        boolean_cols=['handmade', 'limited_edition']
    )
    
    # Test single sample
    sample = {
        'age': 250,
        'weight': 5000,
        'brand': 'Ming',
        'material': 'porcelain',
        'handmade': True,
        'limited_edition': False
    }
    
    result = encoder.process(sample)
    print(f"Single sample output shape: {result.shape}")
    print(f"First 10 values: {result[0, :10]}")
    
    # Test batch
    batch = [sample, sample]
    batch_result = encoder.process_batch(batch)
    print(f"Batch output shape: {batch_result.shape}")