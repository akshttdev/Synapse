# scripts/data_preparation/vggsound_metadata.py
"""
Download VGG-Sound metadata
Extract 200K video URLs
CPU ONLY
"""

import pandas as pd
import requests
from pathlib import Path
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class VGGSoundPreparation:
    def __init__(self, output_csv: str):
        self.output_csv = Path(output_csv)
        self.output_csv.parent.mkdir(parents=True, exist_ok=True)
        
        # VGG-Sound dataset URL
        self.train_url = "https://www.robots.ox.ac.uk/~vgg/data/vggsound/vggsound.csv"
        self.test_url = "https://www.robots.ox.ac.uk/~vgg/data/vggsound/vggsound_test.csv"
    
    def download_vggsound_csv(self, url: str, name: str) -> pd.DataFrame:
        """Download VGG-Sound CSV"""
        logger.info(f"Downloading {name}...")
        
        try:
            df = pd.read_csv(url, names=['youtube_id', 'start_time', 'label', 'split'])
            logger.info(f"✓ Downloaded {name}: {len(df):,} entries")
            return df
        except Exception as e:
            logger.error(f"Error downloading {name}: {e}")
            return pd.DataFrame()
    
    def prepare_vggsound(self):
        """Main preparation function"""
        logger.info("Starting VGG-Sound metadata preparation...")
        
        # Download both train and test
        df_train = self.download_vggsound_csv(self.train_url, "VGG-Sound train")
        df_test = self.download_vggsound_csv(self.test_url, "VGG-Sound test")
        
        # Combine
        df_all = pd.concat([df_train, df_test], ignore_index=True)
        
        logger.info(f"Total VGG-Sound entries: {len(df_all):,}")
        
        # Clean data
        logger.info("Cleaning data...")
        
        # Remove duplicates
        df_all = df_all.drop_duplicates(subset=['youtube_id', 'start_time'])
        
        # Add metadata
        df_all['media_id'] = [f"vggsound_{i:08d}" for i in range(len(df_all))]
        df_all['media_type'] = 'video'
        
        # Construct YouTube URL
        df_all['youtube_url'] = 'https://www.youtube.com/watch?v=' + df_all['youtube_id']
        
        # VGG-Sound clips are 10 seconds
        df_all['duration'] = 10.0
        df_all['end_time'] = df_all['start_time'] + df_all['duration']
        
        # Final columns
        df_final = df_all[[
            'media_id', 'media_type', 'youtube_id', 'youtube_url',
            'start_time', 'end_time', 'duration', 'label', 'split'
        ]]
        
        # Sample to 200K if needed
        if len(df_final) > 200000:
            df_final = df_final.sample(n=200000, random_state=42)
            logger.info("Sampled down to 200K entries")
        
        # Save
        df_final.to_csv(self.output_csv, index=False)
        
        logger.info(f"✓ Saved {len(df_final):,} entries to {self.output_csv}")
        
        # Statistics
        logger.info("\n=== Statistics ===")
        logger.info(f"Total entries: {len(df_final):,}")
        logger.info(f"Unique videos: {df_final['youtube_id'].nunique():,}")
        logger.info(f"Unique labels: {df_final['label'].nunique()}")
        logger.info(f"\nTop 10 labels:")
        logger.info(df_final['label'].value_counts().head(10))

if __name__ == "__main__":
    OUTPUT_CSV = "data/processed/vggsound_200k.csv"
    
    prep = VGGSoundPreparation(output_csv=OUTPUT_CSV)
    prep.prepare_vggsound()