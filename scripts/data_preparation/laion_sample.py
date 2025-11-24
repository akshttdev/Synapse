# scripts/data_preparation/laion_sample.py
"""
Sample 3% (~12M) from LAION-400M parquet files
Removes NSFW, broken URLs, invalid dimensions, empty captions
CPU ONLY - No GPU required
"""

import pandas as pd
import numpy as np
from pathlib import Path
import logging
from typing import List
from tqdm import tqdm
import re
from urllib.parse import urlparse

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class LAIONSampler:
    def __init__(
        self,
        laion_parquet_dir: str,
        output_csv: str,
        sample_rate: float = 0.03,  # 3% sampling
        min_width: int = 256,
        min_height: int = 256,
        min_caption_length: int = 10
    ):
        self.laion_dir = Path(laion_parquet_dir)
        self.output_csv = Path(output_csv)
        self.sample_rate = sample_rate
        self.min_width = min_width
        self.min_height = min_height
        self.min_caption_length = min_caption_length
        
        # Create output directory
        self.output_csv.parent.mkdir(parents=True, exist_ok=True)
    
    def is_valid_url(self, url: str) -> bool:
        """Check if URL is valid"""
        try:
            result = urlparse(url)
            return all([result.scheme, result.netloc])
        except:
            return False
    
    def clean_row(self, row: pd.Series) -> bool:
        """
        Filter out invalid rows
        Returns True if row should be kept
        """
        # Check NSFW flag
        if row.get('NSFW', 'UNLIKELY') not in ['UNLIKELY', 'UNSURE']:
            return False
        
        # Check URL
        if not self.is_valid_url(row.get('URL', '')):
            return False
        
        # Check dimensions
        width = row.get('WIDTH', 0)
        height = row.get('HEIGHT', 0)
        if width < self.min_width or height < self.min_height:
            return False
        
        # Check caption
        caption = str(row.get('TEXT', ''))
        if len(caption.strip()) < self.min_caption_length:
            return False
        
        return True
    
    def process_parquet_file(self, parquet_path: Path) -> pd.DataFrame:
        """Process a single parquet file"""
        try:
            # Read parquet with sampling
            df = pd.read_parquet(parquet_path)
            
            # Random sampling
            n_samples = int(len(df) * self.sample_rate)
            df_sampled = df.sample(n=n_samples, random_state=42)
            
            # Apply cleaning filters
            mask = df_sampled.apply(self.clean_row, axis=1)
            df_clean = df_sampled[mask]
            
            logger.info(
                f"Processed {parquet_path.name}: "
                f"{len(df)} → {len(df_sampled)} sampled → {len(df_clean)} clean"
            )
            
            return df_clean[['URL', 'TEXT', 'WIDTH', 'HEIGHT', 'similarity']]
        
        except Exception as e:
            logger.error(f"Error processing {parquet_path}: {e}")
            return pd.DataFrame()
    
    def sample_laion(self):
        """Main sampling function"""
        logger.info("Starting LAION sampling...")
        logger.info(f"Looking for parquet files in: {self.laion_dir}")
        
        # Find all parquet files
        parquet_files = list(self.laion_dir.glob("**/*.parquet"))
        
        if not parquet_files:
            raise FileNotFoundError(f"No parquet files found in {self.laion_dir}")
        
        logger.info(f"Found {len(parquet_files)} parquet files")
        
        # Process all files
        all_samples = []
        for parquet_file in tqdm(parquet_files, desc="Processing LAION files"):
            df_clean = self.process_parquet_file(parquet_file)
            if not df_clean.empty:
                all_samples.append(df_clean)
        
        # Combine all samples
        df_final = pd.concat(all_samples, ignore_index=True)
        
        # Add unique IDs
        df_final['media_id'] = [f"laion_{i:08d}" for i in range(len(df_final))]
        df_final['media_type'] = 'image'
        
        # Reorder columns
        df_final = df_final[[
            'media_id', 'media_type', 'URL', 'TEXT', 
            'WIDTH', 'HEIGHT', 'similarity'
        ]]
        
        # Save to CSV
        df_final.to_csv(self.output_csv, index=False)
        
        logger.info(f"✓ Saved {len(df_final)} samples to {self.output_csv}")
        logger.info(f"Target: ~12M samples, Got: {len(df_final):,}")
        
        # Statistics
        logger.info("\n=== Statistics ===")
        logger.info(f"Total samples: {len(df_final):,}")
        logger.info(f"Avg caption length: {df_final['TEXT'].str.len().mean():.1f}")
        logger.info(f"Avg similarity: {df_final['similarity'].mean():.3f}")
        logger.info(f"Avg width: {df_final['WIDTH'].mean():.0f}")
        logger.info(f"Avg height: {df_final['HEIGHT'].mean():.0f}")

if __name__ == "__main__":
    # Configuration
    LAION_DIR = "/path/to/laion400m/parquet"  # Update this
    OUTPUT_CSV = "data/processed/laion_12m_sample.csv"
    
    sampler = LAIONSampler(
        laion_parquet_dir=LAION_DIR,
        output_csv=OUTPUT_CSV,
        sample_rate=0.03  # 3% = ~12M samples
    )
    
    sampler.sample_laion()