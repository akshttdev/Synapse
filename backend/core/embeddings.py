# backend/core/embeddings.py
"""
ImageBind embedder (GPU-enabled).
Falls back to CPU if GPU unavailable.

Video is embedded by sampling frames with ffmpeg and mean-pooling their VISION
embeddings (same shared 1024-d space ImageBind's native video path lands in).
This deliberately avoids `pytorchvideo`, which is painful/broken to install on
Python 3.12 + modern torch. We stub it out below so `imagebind.data` still
imports for text/image/audio (which never touch pytorchvideo).
"""
import glob
import logging
import os
import subprocess
import sys
import tempfile
import types
from typing import List

import numpy as np
import torch

logger = logging.getLogger(__name__)

# --- Make `imagebind.data` importable without a real pytorchvideo install. ---
# imagebind/data.py imports pytorchvideo at module top. We only use the
# text/image/audio transforms, so a stub satisfies the import; the video
# functions (which would use it) are never called — we frame-sample instead.
try:  # pragma: no cover - depends on environment
    import pytorchvideo  # noqa: F401
except Exception:  # noqa: BLE001
    # ImageBind's AUDIO path uses ConstantClipsPerVideoSampler to split each
    # file into clips, so it needs a REAL implementation — a bare `object`
    # stub raises "object() takes no arguments". The video stubs below are
    # never called (we frame-sample video instead).
    class _ConstantClipsPerVideoSampler:
        def __init__(self, clip_duration, clips_per_video, augs_per_clip=1):
            self._clip_duration = float(clip_duration)
            self._clips_per_video = int(clips_per_video)
            self._augs_per_clip = int(augs_per_clip)
            self._clip_index = 0
            self._aug_index = 0

        def __call__(self, last_clip_time, video_duration, annotation):
            max_start = max(float(video_duration) - self._clip_duration, 0.0)
            uniform = max_start / max(self._clips_per_video - 1, 1)
            start = uniform * self._clip_index
            end = start + self._clip_duration
            clip_index, aug_index = self._clip_index, self._aug_index
            self._aug_index += 1
            if self._aug_index >= self._augs_per_clip:
                self._aug_index = 0
                self._clip_index += 1
            is_last = self._clip_index >= self._clips_per_video
            result = (start, end, clip_index, aug_index, is_last)
            if is_last:
                # CRITICAL: reset so the NEXT file's clips start from 0 (the real
                # pytorchvideo sampler does this). Without it, files after the
                # first in a batch get out-of-bounds, 0-sample clips.
                self._clip_index = 0
                self._aug_index = 0
            return result

        def reset(self):
            self._clip_index = 0
            self._aug_index = 0

    _pv = types.ModuleType("pytorchvideo")
    _pv_t = types.ModuleType("pytorchvideo.transforms")
    _pv_d = types.ModuleType("pytorchvideo.data")
    _pv_cs = types.ModuleType("pytorchvideo.data.clip_sampling")
    _pv_ev = types.ModuleType("pytorchvideo.data.encoded_video")
    _pv_cs.ConstantClipsPerVideoSampler = _ConstantClipsPerVideoSampler
    _pv_ev.EncodedVideo = object
    _pv_t.ShortSideScale = object
    _pv_t.UniformTemporalSubsample = object
    _pv.transforms = _pv_t
    _pv.data = _pv_d
    _pv_d.clip_sampling = _pv_cs
    _pv_d.encoded_video = _pv_ev
    sys.modules.update({
        "pytorchvideo": _pv,
        "pytorchvideo.transforms": _pv_t,
        "pytorchvideo.data": _pv_d,
        "pytorchvideo.data.clip_sampling": _pv_cs,
        "pytorchvideo.data.encoded_video": _pv_ev,
    })

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
    def __init__(self, device: str = "cuda:0", batch_size: int = 32, fp16: bool = True):
        # Resolve the device: CUDA if asked+available, Apple MPS if asked+available,
        # else CPU. (MPS = Apple Metal GPU; useful when serving on a Mac.)
        _mps_ok = getattr(torch.backends, "mps", None) is not None and torch.backends.mps.is_available()
        if device and device.startswith("cuda") and torch.cuda.is_available():
            self.device = device
        elif device == "mps" and _mps_ok:
            self.device = "mps"
        else:
            self.device = "cpu"
        self.batch_size = batch_size
        # fp16 autocast is a CUDA path only; MPS/CPU run full precision.
        self.use_fp16 = bool(fp16) and self.device.startswith("cuda")
        self.model = None
        logger.info(f"Initializing ImageBindEmbedder on {self.device} (fp16={self.use_fp16})")
        if _IMAGEBIND_AVAILABLE:
            self._load_model()
        else:
            logger.warning("ImageBind package not installed. Embedding calls will fail until installed.")

    def _forward(self, inputs):
        """Run the model, using fp16 autocast on CUDA to fit small GPUs."""
        if self.use_fp16:
            with torch.autocast(device_type="cuda", dtype=torch.float16):
                return self.model(inputs)
        return self.model(inputs)

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
            out = self._forward(inputs)
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
            out = self._forward(inputs)
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
            out = self._forward(inputs)
            emb = out[ModalityType.AUDIO].cpu().numpy()
            all_emb.append(emb)
        result = np.vstack(all_emb).astype(np.float32)
        norms = np.linalg.norm(result, axis=1, keepdims=True)
        return (result / (norms + 1e-8)).astype(np.float32)

    @staticmethod
    def _extract_frames(path: str, n: int) -> List[str]:
        """Sample up to n frames from a video to temp jpgs via ffmpeg."""
        d = tempfile.mkdtemp(prefix="synapse_frames_")
        out = os.path.join(d, "f_%03d.jpg")
        # Evenly-ish sampled frames, scaled down (ImageBind re-crops to 224).
        subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error", "-i", path,
             "-vf", "fps=1,scale=256:-2", "-frames:v", str(n), out],
            check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
        frames = sorted(glob.glob(os.path.join(d, "f_*.jpg")))
        if not frames:  # very short clip — grab the first frame only
            subprocess.run(
                ["ffmpeg", "-y", "-loglevel", "error", "-i", path,
                 "-frames:v", "1", "-vf", "scale=256:-2", os.path.join(d, "f_000.jpg")],
                check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
            )
            frames = sorted(glob.glob(os.path.join(d, "f_*.jpg")))
        return frames

    @torch.inference_mode()
    def embed_videos(self, video_paths: List[str], num_frames: int = 6) -> np.ndarray:
        """
        Embed video by mean-pooling the VISION embeddings of sampled frames.
        Lands in the same shared 1024-D space as image/text/audio, and needs no
        pytorchvideo. One vector per input video.
        """
        if self.model is None:
            raise RuntimeError("ImageBind model not loaded")
        vecs = []
        for path in video_paths:
            frames = self._extract_frames(path, num_frames)
            if not frames:
                logger.warning("no frames extracted from %s; using zero vector", path)
                vecs.append(np.zeros(1024, dtype=np.float32))
                continue
            try:
                frame_emb = self.embed_images(frames)  # (F, 1024), L2-normalised
                v = frame_emb.mean(axis=0)
                v = v / (np.linalg.norm(v) + 1e-8)
                vecs.append(v.astype(np.float32))
            finally:
                for f in frames:
                    try:
                        os.remove(f)
                    except OSError:
                        pass
        return np.vstack(vecs).astype(np.float32)

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
def get_embedder(device: str = None, batch_size: int = None, fp16: bool = None):
    global _embedder
    if _embedder is None:
        if fp16 is None:
            try:
                from core.config import get_settings
                fp16 = get_settings().MODEL_FP16
            except Exception:  # noqa: BLE001
                fp16 = True
        _embedder = ImageBindEmbedder(
            device=(device or "cuda:0"),
            batch_size=(batch_size or 32),
            fp16=fp16,
        )
    return _embedder
