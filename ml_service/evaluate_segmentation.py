from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import numpy as np
import requests
from PIL import Image


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


def load_mask(path: Path, size: tuple[int, int] | None = None) -> np.ndarray:
    image = Image.open(path).convert("L")
    if size and image.size != size:
        image = image.resize(size, Image.Resampling.NEAREST)
    return np.array(image) >= 128


def calculate_metrics(prediction: np.ndarray, target: np.ndarray) -> dict[str, float]:
    prediction = prediction.astype(bool)
    target = target.astype(bool)

    tp = np.logical_and(prediction, target).sum()
    fp = np.logical_and(prediction, ~target).sum()
    fn = np.logical_and(~prediction, target).sum()
    union = np.logical_or(prediction, target).sum()

    iou = tp / union if union else 1.0
    dice = (2 * tp) / (2 * tp + fp + fn) if (2 * tp + fp + fn) else 1.0
    precision = tp / (tp + fp) if (tp + fp) else 1.0
    recall = tp / (tp + fn) if (tp + fn) else 1.0
    coverage = prediction.mean()

    return {
        "iou": float(iou),
        "dice": float(dice),
        "precision": float(precision),
        "recall": float(recall),
        "coverage": float(coverage),
    }


def request_prediction(service_url: str, image_path: Path, output_path: Path) -> None:
    with image_path.open("rb") as image_file:
        response = requests.post(
            f"{service_url.rstrip('/')}/segment/wall",
            files={"photo": (image_path.name, image_file, "image/jpeg")},
            timeout=600,
        )
    response.raise_for_status()
    output_path.write_bytes(response.content)


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate SegFormer wall segmentation quality.")
    parser.add_argument("--service", default="http://localhost:8000", help="FastAPI service URL")
    parser.add_argument("--dataset", default="test_data/segmentation", help="Dataset folder")
    args = parser.parse_args()

    dataset = Path(args.dataset)
    images_dir = dataset / "images"
    masks_dir = dataset / "masks_gt"
    predictions_dir = dataset / "predictions"
    predictions_dir.mkdir(parents=True, exist_ok=True)

    rows: list[dict[str, Any]] = []
    for image_path in sorted(images_dir.iterdir()):
        if image_path.suffix.lower() not in IMAGE_EXTENSIONS:
            continue

        target_path = masks_dir / f"{image_path.stem}.png"
        if not target_path.exists():
            rows.append({"image": image_path.name, "status": "missing_ground_truth"})
            continue

        prediction_path = predictions_dir / f"{image_path.stem}.png"
        request_prediction(args.service, image_path, prediction_path)

        target = load_mask(target_path)
        prediction = load_mask(prediction_path, size=Image.open(target_path).size)
        rows.append({"image": image_path.name, "status": "ok", **calculate_metrics(prediction, target)})

    valid_rows = [row for row in rows if row.get("status") == "ok"]
    summary = {
        metric: float(np.mean([row[metric] for row in valid_rows])) if valid_rows else None
        for metric in ["iou", "dice", "precision", "recall", "coverage"]
    }
    result = {"summary": summary, "items": rows}
    (dataset / "metrics.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
