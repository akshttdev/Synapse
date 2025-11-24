# scripts/data_preparation/audioset_metadata.py
"""
Download and prepare AudioSet metadata
Extract ~2M valid YouTube IDs
CPU ONLY - No audio download or processing
"""

import pandas as pd
import requests
from pathlib import Path
import logging
from tqdm import tqdm
import time

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AudioSetPreparation:
    def __init__(self, output_csv: str):
        self.output_csv = Path(output_csv)
        self.output_csv.parent.mkdir(parents=True, exist_ok=True)
        
        # AudioSet CSV URLs
        self.urls = {
            'balanced_train': 'http://storage.googleapis.com/us_audioset/youtube_corpus/v1/csv/balanced_train_segments.csv',
            'unbalanced_train': 'http://storage.googleapis.com/us_audioset/youtube_corpus/v1/csv/unbalanced_train_segments.csv',
            'eval': 'http://storage.googleapis.com/us_audioset/youtube_corpus/v1/csv/eval_segments.csv',
            'class_labels': 'http://storage.googleapis.com/us_audioset/youtube_corpus/v1/csv/class_labels_indices.csv'
        }
    
    def download_metadata(self, url: str, name: str) -> pd.DataFrame:
        """Download CSV from URL"""
        logger.info(f"Downloading {name}...")
        
        try:
            # AudioSet CSVs have comments (lines starting with #)
            df = pd.read_csv(
                url,
                skiprows=3,  # Skip comment lines
                names=['YTID', 'start_seconds', 'end_seconds', 'positive_labels'],
                dtype={'YTID': str}
            )
            logger.info(f"✓ Downloaded {name}: {len(df):,} entries")
            return df
        except Exception as e:
            logger.error(f"Error downloading {name}: {e}")
            return pd.DataFrame()
    
    def download_class_labels(self) -> dict:
        """Download and parse class labels"""
        logger.info("Downloading class labels...")
        
        try:
            df = pd.read_csv(self.urls['class_labels'])
            label_map = dict(zip(df['mid'], df['display_name']))
            logger.info(f"✓ Loaded {len(label_map)} class labels")
            return label_map
        except Exception as e:
            logger.error(f"Error downloading labels: {e}")
            return {}
    
    def prepare_audioset(self):
        """Main preparation function"""
        logger.info("Starting AudioSet metadata preparation...")
        
        # Download class labels first
        label_map = self.download_class_labels()
        
        # Download all splits
        all_data = []
        
        for split_name, url in self.urls.items():
            if split_name == 'class_labels':
                continue
            
            df = self.download_metadata(url, split_name)
            if not df.empty:
                df['split'] = split_name
                all_data.append(df)
            
            time.sleep(1)  # Be nice to servers
        
        # Combine all splits
        df_all = pd.concat(all_data, ignore_index=True)
        
        logger.info(f"Total AudioSet entries: {len(df_all):,}")
        
        # Clean data
        logger.info("Cleaning data...")
        
        # Remove duplicates
        df_all = df_all.drop_duplicates(subset=['YTID', 'start_seconds'])
        
        # Remove entries with missing labels
        df_all = df_all[df_all['positive_labels'].notna()]
        
        # Parse labels (comma-separated MIDs)
        def parse_labels(label_str):
            mids = label_str.strip('"').split(',')
            return [label_map.get(mid.strip(), 'Unknown') for mid in mids]
        
        df_all['label_names'] = df_all['positive_labels'].apply(parse_labels)
        
        # Add metadata
        df_all['media_id'] = [f"audioset_{i:08d}" for i in range(len(df_all))]
        df_all['media_type'] = 'audio'
        df_all['duration'] = df_all['end_seconds'] - df_all['start_seconds']
        
        # Construct YouTube URL
        df_all['youtube_url'] = 'https://www.youtube.com/watch?v=' + df_all['YTID']
        
        # Select final columns
        df_final = df_all[[
            'media_id', 'media_type', 'YTID', 'youtube_url',
            'start_seconds', 'end_seconds', 'duration',
            'positive_labels', 'label_names', 'split'
        ]]
        
        # Save to CSV
        df_final.to_csv(self.output_csv, index=False)
        
        logger.info(f"✓ Saved {len(df_final):,} entries to {self.output_csv}")
        
        # Statistics
        logger.info("\n=== Statistics ===")
        logger.info(f"Total entries: {len(df_final):,}")
        logger.info(f"Unique videos: {df_final['YTID'].nunique():,}")
        logger.info(f"Avg duration: {df_final['duration'].mean():.1f}s")
        logger.info(f"Avg labels per clip: {df_final['label_names'].str.len().mean():.1f}")
        logger.info(f"\nSplit distribution:")
        logger.info(df_final['split'].value_counts())

if __name__ == "__main__":
    OUTPUT_CSV = "data/processed/audioset_2m.csv"
    
    prep = AudioSetPreparation(output_csv=OUTPUT_CSV)
    prep.prepare_audioset()