from __future__ import annotations

import io
import os
import threading
from typing import Any

import numpy as np
import torch
import torch.nn.functional as F
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from PIL import Image, ImageFilter
from transformers import AutoImageProcessor, SegformerForSemanticSegmentation


MODEL_NAME = os.getenv("SEGFORMER_MODEL", "nvidia/segformer-b1-finetuned-ade-512-512")
WALL_LABELS = {"wall", "wall;brick", "wall;stone", "wall;wood"}
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

app = FastAPI(title="BauTex SegFormer Wall Segmentation", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001", "http://localhost:3003"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_model_lock = threading.Lock()
_processor: AutoImageProcessor | None = None
_model: SegformerForSemanticSegmentation | None = None
_wall_label_ids: list[int] = []


def _load_model() -> tuple[AutoImageProcessor, SegformerForSemanticSegmentation, list[int]]:
    global _processor, _model, _wall_label_ids

    with _model_lock:
        if _processor is not None and _model is not None and _wall_label_ids:
            return _processor, _model, _wall_label_ids

        processor = AutoImageProcessor.from_pretrained(MODEL_NAME)
        model = SegformerForSemanticSegmentation.from_pretrained(MODEL_NAME)
        model.to(DEVICE)
        model.eval()

        id2label: dict[int, str] = {
            int(k): str(v).lower()
            for k, v in model.config.id2label.items()
        }
        wall_ids = [
            label_id
            for label_id, label in id2label.items()
            if label in WALL_LABELS or label.split(",")[0].strip() == "wall"
        ]

        if not wall_ids:
            raise RuntimeError(f"Model {MODEL_NAME} does not expose a wall label")

        _processor = processor
        _model = model
        _wall_label_ids = wall_ids
        return processor, model, wall_ids


def _read_image(file_bytes: bytes) -> Image.Image:
    try:
        image = Image.open(io.BytesIO(file_bytes)).convert("RGB")
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid image file") from exc

    if image.width < 64 or image.height < 64:
        raise HTTPException(status_code=400, detail="Image is too small")

    return image


def _postprocess_mask(mask: np.ndarray) -> Image.Image:
    mask_image = Image.fromarray(mask.astype(np.uint8) * 255, mode="L")
    mask_image = mask_image.filter(ImageFilter.MedianFilter(size=5))
    mask_image = mask_image.filter(ImageFilter.GaussianBlur(radius=1.4))
    return mask_image.point(lambda value: 255 if value >= 96 else 0, mode="L")


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "model": MODEL_NAME,
        "device": DEVICE,
        "loaded": _model is not None,
        "wallLabelIds": _wall_label_ids,
    }


@app.post("/segment/wall")
async def segment_wall(photo: UploadFile = File(...)) -> Response:
    file_bytes = await photo.read()
    image = _read_image(file_bytes)
    processor, model, wall_ids = _load_model()

    inputs = processor(images=image, return_tensors="pt")
    inputs = {key: value.to(DEVICE) for key, value in inputs.items()}

    with torch.no_grad():
        outputs = model(**inputs)
        logits = F.interpolate(
            outputs.logits,
            size=(image.height, image.width),
            mode="bilinear",
            align_corners=False,
        )
        segmentation = logits.argmax(dim=1)[0].cpu().numpy()

    wall_mask = np.isin(segmentation, wall_ids)
    mask_image = _postprocess_mask(wall_mask)

    buffer = io.BytesIO()
    mask_image.save(buffer, format="PNG")
    return Response(content=buffer.getvalue(), media_type="image/png")
