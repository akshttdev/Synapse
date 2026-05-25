# backend/core/embeddings.py
"""
ImageBind embedder (GPU-enabled).
Falls back to CPU if GPU unavailable.
"""
import logging
from typing import List
import numpy as np
import torch

logger = logging.getLogger(__name__)

# Try to import ImageBind
try:
    from imagebind import data
    from imagebind.models import imagebind_model
    from imagebind.models.imagebind_model import ModalityType
    _IMAGEBIND_AVAILABLE = True
except Exception as e:
    logger.warning(f"imagebind not available: {e}")
    _IMAGEBIND_AVAILABLE = False
    ModalityType = None

class ImageBindEmbedder:
    def __init__(self, device: str = "cuda:0", batch_size: int = 32):
        self.device = device if torch.cuda.is_available() and device.startswith("cuda") else "cpu"
        self.batch_size = batch_size
        self.model = None
        logger.info(f"Initializing ImageBindEmbedder on {self.device}")
        if _IMAGEBIND_AVAILABLE:
            self._load_model()
        else:
            logger.warning("ImageBind package not installed. Embedding calls will fail until installed.")

    def _load_model(self):
        logger.info("Loading ImageBind model...")
        # use imagebind huge by default (if available)
        model = imagebind_model.imagebind_huge(pretrained=True)
        model.eval()
        model.to(self.device)
        # optional compile
        if self.device != "cpu" and hasattr(torch, "compile"):
            try:
                model = torch.compile(model, mode="reduce-overhead")
            except Exception as e:
                logger.debug(f"torch.compile skipped: {e}")
        self.model = model
        logger.info("ImageBind model loaded")

    @torch.inference_mode()
    def embed_text(self, texts: List[str]) -> np.ndarray:
        if self.model is None:
            raise RuntimeError("ImageBind model not loaded")
        all_emb = []
        for i in range(0, len(texts), self.batch_size):
            batch = texts[i:i+self.batch_size]
            inputs = {ModalityType.TEXT: data.load_and_transform_text(batch, device=self.device)}
            out = self.model(inputs)
            emb = out[ModalityType.TEXT].cpu().numpy()
            all_emb.append(emb)
        result = np.vstack(all_emb).astype(np.float32)
        norms = np.linalg.norm(result, axis=1, keepdims=True)
        return (result / (norms + 1e-8)).astype(np.float32)

    @torch.inference_mode()
    def embed_images(self, image_paths: List[str]) -> np.ndarray:
        if self.model is None:
            raise RuntimeError("ImageBind model not loaded")
        all_emb = []
        for i in range(0, len(image_paths), self.batch_size):
            batch = image_paths[i:i+self.batch_size]
            inputs = {ModalityType.VISION: data.load_and_transform_vision_data(batch, device=self.device)}
            out = self.model(inputs)
            emb = out[ModalityType.VISION].cpu().numpy()
            all_emb.append(emb)
        result = np.vstack(all_emb).astype(np.float32)
        norms = np.linalg.norm(result, axis=1, keepdims=True)
        return (result / (norms + 1e-8)).astype(np.float32)

    @torch.inference_mode()
    def embed_audio(self, audio_paths: List[str]) -> np.ndarray:
        if self.model is None:
            raise RuntimeError("ImageBind model not loaded")
        all_emb = []
        for i in range(0, len(audio_paths), self.batch_size):
            batch = audio_paths[i:i+self.batch_size]
            inputs = {ModalityType.AUDIO: data.load_and_transform_audio_data(batch, device=self.device)}
            out = self.model(inputs)
            emb = out[ModalityType.AUDIO].cpu().numpy()
            all_emb.append(emb)
        result = np.vstack(all_emb).astype(np.float32)
        norms = np.linalg.norm(result, axis=1, keepdims=True)
        return (result / (norms + 1e-8)).astype(np.float32)

    @torch.inference_mode()
    def embed_videos(self, video_paths: List[str]) -> np.ndarray:
        """
        Real video embedding via ImageBind's video loader (5 uniformly-sampled
        2-second clips, decoded with decord). Output lives in the VISION space
        — same shared 1024-D sphere as image/text/audio.
        """
        if self.model is None:
            raise RuntimeError("ImageBind model not loaded")
        all_emb = []
        for i in range(0, len(video_paths), self.batch_size):
            batch = video_paths[i:i+self.batch_size]
            inputs = {
                ModalityType.VISION: data.load_and_transform_video_data(
                    batch, device=self.device
                )
            }
            out = self.model(inputs)
            emb = out[ModalityType.VISION].cpu().numpy()
            all_emb.append(emb)
        result = np.vstack(all_emb).astype(np.float32)
        norms = np.linalg.norm(result, axis=1, keepdims=True)
        return (result / (norms + 1e-8)).astype(np.float32)

    def embed_single(self, path: str, modality: str):
        modality = modality.lower()
        if modality == "image":
            return self.embed_images([path])[0]
        elif modality == "audio":
            return self.embed_audio([path])[0]
        elif modality == "video":
            return self.embed_videos([path])[0]
        elif modality == "text":
            return self.embed_text([path])[0]
        else:
            raise ValueError(f"Unknown modality {modality}")


# singleton accessor
_embedder = None
def get_embedder(device: str = None, batch_size: int = None):
    global _embedder
    settings_device = device
    if _embedder is None:
        _embedder = ImageBindEmbedder(device=(device or "cuda:0"), batch_size=(batch_size or 32))
    return _embedder
